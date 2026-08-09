import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports that the API is running', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
