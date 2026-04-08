import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Discussion, GetDiscussionsDto } from '../forum';
import { GetModsDto, Mode } from '../mods';
import { CommentItem } from '../shared/interfaces/commentItem';

/**
 * Сервис для работы с моковыми данными.
 */
@Injectable({
  providedIn: 'root',
})
export class MockService {
  /**
   * Получает список обсуждений на форуме.
   * @returns Массив обсуждений.
   */
  getDiscussions(params: GetDiscussionsDto): Observable<Discussion[]> {
    return of(
      [
        {
          id: 1,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '2025-12-01T12:41:06+03:00',
          commentsCount: 9,
          likes: 12,
        },
        {
          id: 2,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '2025-11-01T12:41:06+03:00',
          commentsCount: 9,
          likes: 12,
        },
        {
          id: 3,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '2025-10-02T12:41:06+03:00',
          commentsCount: 9,
          likes: 12,
        },
        {
          id: 4,
          theme: 'Тема',
          author: 'Владимир',
          createdAt: '2025-11-28T12:41:06+03:00',
          commentsCount: 9,
          likes: 12,
        },
        {
          id: 5,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '2025-07-04T12:41:06+03:00',
          commentsCount: 9,
          likes: 12,
        },
      ]
        .filter((discussion) =>
          params.search
            ? `${discussion.theme} ${discussion.author}`.includes(params.search)
            : true
        )
        .slice((params.page - 1) * 3, (params.page - 1) * 3 + 3)
    );
  }

  getMods(params: GetModsDto): Observable<Mode[]> {
    return of(
      [
        {
          id: 1,
          name: 'Горная тропа',
          author: 'Дмитрий',
          likesCount: 209,
          commentsCount: 14,
          description:
            'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
          images: [
            {
              url: '/assets/imgs/mods/mode-preview-1.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-2.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-3.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-4.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-5.png',
            },
          ],
        },
        {
          id: 2,
          name: 'Горная тропа',
          author: 'Дмитрий',
          likesCount: 209,
          commentsCount: 14,
          description:
            'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
          images: [
            {
              url: '/assets/imgs/mods/mode-preview-1.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-2.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-3.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-4.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-5.png',
            },
          ],
        },
        {
          id: 3,
          name: 'Горная тропа',
          author: 'Дмитрий',
          likesCount: 209,
          commentsCount: 14,
          description:
            'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
          images: [
            {
              url: '/assets/imgs/mods/mode-preview-1.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-2.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-3.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-4.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-5.png',
            },
          ],
        },
        {
          id: 4,
          name: 'Горная тропа',
          author: 'Дмитрий',
          likesCount: 209,
          commentsCount: 14,
          description:
            'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
          images: [
            {
              url: '/assets/imgs/mods/mode-preview-1.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-2.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-3.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-4.png',
            },
            {
              url: 'assets/imgs/mods/mode-preview-5.png',
            },
          ],
        },
      ]
        .filter((discussion) =>
          params.search
            ? `${discussion.name} ${discussion.author}`.includes(params.search)
            : true
        )
        .slice((params.page - 1) * 3, (params.page - 1) * 3 + 3)
    );
  }

  getModsData(): Observable<Mode[]> {
    return of([
      {
        id: 1,
        name: 'Горная тропа',
        author: 'Дмитрий',
        likesCount: 209,
        commentsCount: 14,
        description:
          'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
        images: [
          {
            url: '/assets/imgs/mods/mode-preview-1.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-2.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-3.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-4.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-5.png',
          },
        ],
      },
      {
        id: 2,
        name: 'Горная тропа',
        author: 'Дмитрий',
        likesCount: 209,
        commentsCount: 14,
        description:
          'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
        images: [
          {
            url: '/assets/imgs/mods/mode-preview-1.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-2.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-3.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-4.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-5.png',
          },
        ],
      },
      {
        id: 3,
        name: 'Горная тропа',
        author: 'Дмитрий',
        likesCount: 209,
        commentsCount: 14,
        description:
          'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
        images: [
          {
            url: '/assets/imgs/mods/mode-preview-1.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-2.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-3.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-4.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-5.png',
          },
        ],
      },
      {
        id: 4,
        name: 'Горная тропа',
        author: 'Дмитрий',
        likesCount: 209,
        commentsCount: 14,
        description:
          'Текстуры домов, дорог, окружения и атрибутов деревни дварфов',
        images: [
          {
            url: '/assets/imgs/mods/mode-preview-1.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-2.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-3.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-4.png',
          },
          {
            url: 'assets/imgs/mods/mode-preview-5.png',
          },
        ],
      },
    ]);
  }

  getModeById(id: number): Observable<Mode | undefined> {
    return this.getModsData().pipe(
      map((mods) => mods.find((mode) => mode.id === id))
    );
  }

  getModsFilters() {
    return of([
      {
        name: 'Биом',
        value: 'biome',
        count: 122,
        extras: [],
      },
      {
        name: 'Расы',
        value: 'species',
        count: 134,
        extras: [
          {
            name: 'Эльф',
            value: 'elf',
            count: 19,
            selected: false,
          },
          {
            name: 'Дварф',
            value: 'dwarf',
            count: 23,
            selected: false,
          },
          {
            name: 'Голиаф',
            value: 'goliath',
            count: 12,
            selected: false,
          },
        ],
      },
      {
        name: 'Интерьер',
        value: 'interior',
        count: 13,
        extras: [],
      },
    ]);
  }

  getComments(): Observable<CommentItem[]> {
    return of([
      {
        id: 1,
        user: 'User 1',
        text: 'Классные текстуры!',
        date: '2026-04-02T10:00:00+03:00',
        replies: [
          {
            id: 2,
            user: 'User 2 lasf djf ;l ks a d j; l k f s ak ;ldjf;lksjadl;kfl;sakdjfl;kasjdlfjslakdjflaskdfjlsadkfjalk;',
            text: 'Согласен!',
            date: '2026-04-02T15:30:00+03:00',
            replies: [],
          },
          {
            id: 3,
            user: 'User 3',
            text: 'А мне не очень...',
            date: '2026-04-02T15:30:00+03:00',
            replies: [
              {
                id: 4,
                user: 'User 4',
                text: '  Lorem ipsum dolor sit amet, consectetur adipisicing elit. A amet consectetur consequuntur deserunt dolorem doloremque ea eum, fugit ipsam nam nemo, neque repudiandae rerum sunt, vitae voluptate voluptatum? Distinctio, voluptate?\n',
                date: '2026-04-02T15:32:00+03:00',
                replies: [],
              },
            ],
          },
        ],
      },
    ]);
  }
}
