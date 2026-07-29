import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PopoverComponent } from './popover.component';

@Component({
  imports: [PopoverComponent],
  template: `
    <wm-popover>
      <button wmPopoverTrigger type="button">Open</button>
      <a wmPopoverContent href="/">Profile</a>
    </wm-popover>
  `,
})
class TestHostComponent {}

describe('PopoverComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('opens from its trigger and closes after a content click', () => {
    fixture.debugElement
      .query(By.css('.popover-trigger'))
      .triggerEventHandler('click');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.popover-panel'))).toBeTruthy();

    fixture.debugElement
      .query(By.css('.popover-panel'))
      .triggerEventHandler('click');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.popover-panel'))).toBeNull();
  });

  it('closes on Escape', () => {
    const popover = fixture.debugElement
      .query(By.directive(PopoverComponent))
      .injector.get(PopoverComponent);
    popover.toggle();
    popover.onEscape();

    expect(popover.isOpen()).toBe(false);
  });

  it('closes on a pointer event outside', () => {
    const popover = fixture.debugElement
      .query(By.directive(PopoverComponent))
      .injector.get(PopoverComponent);
    popover.toggle();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(popover.isOpen()).toBe(false);
  });
});
