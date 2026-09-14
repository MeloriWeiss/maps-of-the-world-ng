import 'dotenv/config';
import {
  ExecutionContext,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios, { Method } from 'axios';
import { Prisma, PrismaMainService } from '@wm/api/database-main';
import {
  AccessRequest,
  JwtAccessGuard,
  OptionalJwtAccessGuard,
} from '@wm/api/auth';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
type AccessPayload = AccessRequest['user'];

// Opt-in real PostgreSQL test. Every fixture and HTTP mutation is rolled back.
const describeDatabase =
  process.env['FORUM_DATABASE_TESTS'] === '1' ? describe : describe.skip;
describeDatabase('Forum HTTP with PostgreSQL', () => {
  it('creates, paginates, replies, edits, moderates and enforces ownership over HTTP', async () => {
    const prisma = new PrismaMainService(new ConfigService(process.env));
    const rollback = new Error('ROLLBACK_FORUM_TEST_FIXTURES');
    await prisma.$connect();
    try {
      await prisma.$transaction(
        async (tx) => {
          const stamp = Date.now();
          const users = await Promise.all(
            ['owner', 'other', 'admin'].map((name) =>
              tx.user.create({
                data: {
                  username: 'forum-test-' + name + '-' + stamp,
                  email:
                    'forum-test-' + name + '-' + stamp + '@example.invalid',
                  passwordHash: 'not-a-login-hash',
                  personalAccount: { create: { nickname: name } },
                },
                include: { personalAccount: true },
              }),
            ),
          );
          const identities = new Map<string, AccessPayload>();
          for (const [index, name] of ['owner', 'other', 'admin'].entries()) {
            const account = users[index].personalAccount;
            if (!account) throw new Error('Missing fixture account');
            identities.set(name, {
              userId: users[index].id,
              profileId: account.id,
              role: name === 'admin' ? 'ADMIN' : 'USER',
            });
          }
          const category = await tx.forumCategory.create({
            data: { slug: 'test-' + stamp, title: 'Test category' },
          });
          const transactionAdapter = new Proxy(tx, {
            get(target, key) {
              if (key === 'onModuleInit' || key === 'onModuleDestroy')
                return undefined;
              if (key === '$transaction')
                return (
                  action:
                    | ((
                        transaction: Prisma.TransactionClient,
                      ) => Promise<unknown>)
                    | Promise<unknown>[],
                ) => (Array.isArray(action) ? Promise.all(action) : action(tx));
              return Reflect.get(target, key);
            },
          });
          const setIdentity = (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest<{
              headers: Record<string, string | undefined>;
              user?: AccessPayload;
            }>();
            request.user = identities.get(
              request.headers['x-test-actor'] ?? '',
            );
            return request.user;
          };
          const moduleRef = await Test.createTestingModule({
            controllers: [ForumController],
            providers: [
              ForumService,
              { provide: PrismaMainService, useValue: transactionAdapter },
            ],
          })
            .overrideGuard(JwtAccessGuard)
            .useValue({
              canActivate: (context: ExecutionContext) => {
                if (!setIdentity(context)) throw new UnauthorizedException();
                return true;
              },
            })
            .overrideGuard(OptionalJwtAccessGuard)
            .useValue({
              canActivate: (context: ExecutionContext) => {
                setIdentity(context);
                return true;
              },
            })
            .compile();
          const app = moduleRef.createNestApplication();
          app.useGlobalPipes(
            new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
            }),
          );
          await app.listen(0, '127.0.0.1');
          const url = await app.getUrl();
          const request = <T>(
            method: Method,
            path: string,
            data?: unknown,
            actor = 'owner',
          ) =>
            axios.request<T>({
              method,
              url: url + path,
              data,
              headers: { 'x-test-actor': actor },
              validateStatus: () => true,
            });
          try {
            const payload = {
              title: 'Новый мир',
              post: 'Описание мира для тестовой игры.',
              category: category.slug,
            };
            expect(
              (await request('POST', '/forum-discussions', payload, '')).status,
            ).toBe(401);
            expect(
              (
                await request('POST', '/forum-discussions', {
                  ...payload,
                  post: '           ',
                })
              ).status,
            ).toBe(400);
            const created = await request<{ id: number }>(
              'POST',
              '/forum-discussions',
              payload,
            );
            expect(created.status).toBe(201);
            const id = created.data.id;
            const path = '/forum-discussions/' + id;
            const otherTopic = await request<{ id: number }>(
              'POST',
              '/forum-discussions',
              payload,
            );
            expect(
              (await request('PATCH', path, payload, 'other')).status,
            ).toBe(403);
            expect(
              (
                await request('PATCH', path, {
                  ...payload,
                  title: 'Мир после правки',
                })
              ).status,
            ).toBe(200);
            const root = await request<{ id: number }>(
              'POST',
              path + '/comments',
              { comment: 'Первое сообщение' },
            );
            expect(root.status).toBe(201);
            expect(
              (
                await request(
                  'POST',
                  '/forum-discussions/' + otherTopic.data.id + '/comments',
                  { comment: 'Ответ из другой темы', parentId: root.data.id },
                )
              ).status,
            ).toBe(404);
            const reply = await request<{ id: number }>(
              'POST',
              path + '/comments',
              { comment: 'Ответ на сообщение', parentId: root.data.id },
              'other',
            );
            expect(reply.status).toBe(201);
            expect(
              (
                await request('PATCH', path + '/comments/' + reply.data.id, {
                  comment: 'Чужая правка',
                })
              ).status,
            ).toBe(403);
            expect(
              (
                await request('PATCH', path + '/comments/' + root.data.id, {
                  comment: 'Исправленный текст',
                })
              ).status,
            ).toBe(200);
            for (let index = 0; index < 20; index++) {
              expect(
                (
                  await request('POST', path + '/comments', {
                    comment: 'Сообщение ' + index,
                  })
                ).status,
              ).toBe(201);
            }
            const first = await request<{
              items: { id: number; parent: { id: number } | null }[];
              total: number;
            }>('GET', path + '/comments');
            expect(first.data.items).toHaveLength(20);
            expect(first.data.total).toBe(22);
            expect(first.data.items[1].parent?.id).toBe(root.data.id);
            const second = await request<{ items: { id: number }[] }>(
              'GET',
              path + '/comments?page=2',
            );
            expect(second.data.items).toHaveLength(2);
            const located = await request<{ page: number }>(
              'GET',
              path + '/comments?commentId=' + second.data.items[0].id,
            );
            expect(located.data.page).toBe(2);
            const roots = await request<{
              total: number;
              items: { id: number; repliesCount: number }[];
            }>('GET', path + '/comments?view=tree');
            expect(roots.data.total).toBe(21);
            expect(roots.data.items[0]).toMatchObject({
              id: root.data.id,
              repliesCount: 1,
            });
            const branch = await request<{
              total: number;
              items: { id: number }[];
            }>('GET', path + '/comments?view=tree&parentId=' + root.data.id);
            expect(branch.data.total).toBe(1);
            expect(branch.data.items[0].id).toBe(reply.data.id);
            const nested = await request<{ id: number }>(
              'POST',
              path + '/comments',
              { comment: 'Ответ на ответ', parentId: reply.data.id },
            );
            expect(nested.status).toBe(201);
            const treeLink = await request<{
              page: number;
              path: { id: number; page: number }[];
            }>('GET', path + '/comments?view=tree&commentId=' + nested.data.id);
            expect(treeLink.status).toBe(200);
            expect(treeLink.data.path.map((entry) => entry.id)).toEqual([
              root.data.id,
              reply.data.id,
              nested.data.id,
            ]);
            expect(treeLink.data.page).toBe(1);
            expect(
              (
                await request(
                  'GET',
                  '/forum-discussions/' +
                    otherTopic.data.id +
                    '/comments?view=tree&parentId=' +
                    root.data.id,
                )
              ).status,
            ).toBe(404);
            expect(
              (
                await request(
                  'GET',
                  '/forum-discussions?scope=mine',
                  undefined,
                  '',
                )
              ).status,
            ).toBe(401);
            const mine = await request<{ total: number }>(
              'GET',
              '/forum-discussions?scope=mine&category=' + category.slug,
            );
            expect(mine.data.total).toBe(2);
            const unanswered = await request<{ items: { id: number }[] }>(
              'GET',
              '/forum-discussions?sort=unanswered&category=' + category.slug,
            );
            expect(unanswered.data.items.map((item) => item.id)).toEqual([
              otherTopic.data.id,
            ]);
            const beforeLike = await tx.forum.findUniqueOrThrow({
              where: { id },
            });
            await request('POST', path + '/likes');
            await request('POST', path + '/likes');
            const afterLike = await tx.forum.findUniqueOrThrow({
              where: { id },
            });
            expect(afterLike.likesCount).toBe(1);
            expect(afterLike.lastActivityAt).toEqual(beforeLike.lastActivityAt);
            const moderation = '/admin/forum-discussions/' + id;
            expect(
              (
                await request('PATCH', moderation + '/moderation', {
                  isClosed: true,
                })
              ).status,
            ).toBe(403);
            expect(
              (
                await request(
                  'PATCH',
                  moderation + '/moderation',
                  { isClosed: true, isPinned: true },
                  'admin',
                )
              ).status,
            ).toBe(200);
            expect(
              (
                await request('POST', path + '/comments', {
                  comment: 'Закрытая тема',
                })
              ).status,
            ).toBe(403);
            expect((await request('PATCH', path, payload)).status).toBe(403);
            expect(
              (
                await request('PATCH', path + '/comments/' + root.data.id, {
                  comment: 'Новая правка',
                })
              ).status,
            ).toBe(403);
            expect(
              (
                await request(
                  'PATCH',
                  moderation + '/comments/' + root.data.id + '/visibility',
                  { isHidden: true },
                  'admin',
                )
              ).status,
            ).toBe(200);
            const hidden = await request<{
              items: {
                text: string;
                isHidden: boolean;
                parent: { id: number } | null;
              }[];
            }>('GET', path + '/comments');
            expect(hidden.data.items[0].text).toBe('');
            expect(hidden.data.items[0].isHidden).toBe(true);
            expect(hidden.data.items[1].parent?.id).toBe(root.data.id);
            const hiddenRoot = await request<{
              items: { text: string; repliesCount: number }[];
            }>('GET', path + '/comments?view=tree');
            expect(hiddenRoot.data.items[0]).toMatchObject({
              text: '',
              repliesCount: 1,
            });
            const hiddenPath = await request<{ path: { id: number }[] }>(
              'GET',
              path + '/comments?view=tree&commentId=' + nested.data.id,
            );
            expect(hiddenPath.data.path.map((entry) => entry.id)).toEqual([
              root.data.id,
              reply.data.id,
              nested.data.id,
            ]);
            expect(
              (
                await request(
                  'PATCH',
                  moderation + '/comments/' + root.data.id + '/visibility',
                  { isHidden: false },
                  'admin',
                )
              ).status,
            ).toBe(200);
            expect(
              await tx.adminAuditLog.count({ where: { actorId: users[2].id } }),
            ).toBe(3);
            await tx.forum.update({ where: { id }, data: { isHidden: true } });
            expect((await request('GET', path)).status).toBe(404);
            expect((await request('GET', path + '/comments')).status).toBe(404);
          } finally {
            await app.close();
          }
          throw rollback;
        },
        { timeout: 60000 },
      );
      throw new Error('Integration fixtures were unexpectedly committed');
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await prisma.$disconnect();
    }
  }, 90000);
});
