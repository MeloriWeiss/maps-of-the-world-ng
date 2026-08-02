import { Routes } from '@angular/router';
import { TexturePackCatalogPageComponent } from '../texture-pack-catalog-page.component';
import { TexturePackDetailsPageComponent } from '../texture-pack-details-page.component';
import { TexturePackEditPageComponent } from '../texture-pack-edit-page.component';

export const texturePacksRoutes: Routes = [
  {
    path: ':id/edit',
    component: TexturePackEditPageComponent,
    title: 'Maps of the world: Редактирование текстур-пака',
  },
  {
    path: ':id',
    component: TexturePackDetailsPageComponent,
    title: 'Maps of the world: Текстур-пак',
  },
  {
    path: '',
    component: TexturePackCatalogPageComponent,
    title: 'Maps of the world: Текстур-паки',
  },
];
