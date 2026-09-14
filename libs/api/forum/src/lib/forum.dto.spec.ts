import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateForumCommentDto,
  CreateForumDiscussionDto,
  ForumCommentsQueryDto,
  ListForumDiscussionsDto,
  ModerateForumDto,
} from './forum.dto';

describe('Forum input validation', () => {
  it('rejects whitespace-only comments and topics after trimming', async () => {
    expect(
      await validate(
        plainToInstance(CreateForumCommentDto, { comment: '   ' }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateForumDiscussionDto, {
          title: '   ',
          post: '                 ',
          category: ' ',
        }),
      ),
    ).toHaveLength(3);
  });
  it('normalizes real content without changing line breaks', async () => {
    const dto = plainToInstance(CreateForumCommentDto, {
      comment: '  Первая\nВторая  ',
      parentId: 4,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.comment).toBe('Первая\nВторая');
  });
  it('rejects invalid pagination, sorting and moderation fields', async () => {
    expect(
      await validate(
        plainToInstance(ForumCommentsQueryDto, {
          page: '-1',
          pageSize: '500',
          commentId: '1.5',
        }),
      ),
    ).toHaveLength(3);
    expect(
      await validate(
        plainToInstance(ListForumDiscussionsDto, {
          sort: 'sql',
          scope: 'everyone',
        }),
      ),
    ).toHaveLength(2);
    expect(
      await validate(plainToInstance(ModerateForumDto, { isClosed: 'false' })),
    ).toHaveLength(1);
  });
});
