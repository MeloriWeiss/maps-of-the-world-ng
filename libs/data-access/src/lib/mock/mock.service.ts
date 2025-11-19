import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Discussion, GetDiscussionsDto } from '../forum';
import { GetModsDto, Mode } from '../mods';

@Injectable({
  providedIn: 'root',
})
export class MockService {
  getDiscussions(params: GetDiscussionsDto): Observable<Discussion[]> {
    return of(
      [
        {
          id: 1,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '20.02.20205',
          commentsCount: 9,
        },
        {
          id: 2,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '20.02.20205',
          commentsCount: 9,
        },
        {
          id: 3,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '20.02.20205',
          commentsCount: 9,
        },
        {
          id: 4,
          theme: 'Тема',
          author: 'Владимир',
          createdAt: '20.02.20205',
          commentsCount: 9,
        },
        {
          id: 5,
          theme: 'Тема',
          author: 'Иван',
          createdAt: '20.02.20205',
          commentsCount: 9,
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
}
