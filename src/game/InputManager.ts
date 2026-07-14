export type InputActions = { jump: boolean; dash: boolean };

export class InputManager {
  moveVector = { x: 0, y: 0 };
  jumpHeld = false;
  private jumpPressed = false;
  private dashPressed = false;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private debugMove = { x: 0, y: 0 };
  private knob?: HTMLElement;

  constructor() {
    addEventListener('keydown', event => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.code === 'Space') {
        if (!event.repeat) this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (!event.repeat && ['ShiftLeft', 'ShiftRight', 'KeyE'].includes(event.code)) this.dashPressed = true;
    });
    addEventListener('keyup', event => {
      this.keys.delete(event.code);
      if (event.code === 'Space') this.jumpHeld = false;
    });
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    this.setupTouch();
  }

  update() {
    const x = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
      - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const y = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
      - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    this.moveVector.x = Math.max(-1, Math.min(1, x + this.joy.x + this.debugMove.x));
    this.moveVector.y = Math.max(-1, Math.min(1, y + this.joy.y + this.debugMove.y));
  }

  consume(): InputActions {
    const actions = { jump: this.jumpPressed, dash: this.dashPressed };
    this.jumpPressed = false;
    this.dashPressed = false;
    return actions;
  }

  reset() {
    this.keys.clear();
    this.joy.x = this.joy.y = 0;
    this.debugMove.x = this.debugMove.y = 0;
    this.moveVector.x = this.moveVector.y = 0;
    this.jumpHeld = false;
    this.jumpPressed = false;
    this.dashPressed = false;
    if (this.knob) this.knob.style.transform = '';
  }

  setDebugMove(x: number, y: number) {
    this.debugMove.x = Math.max(-1, Math.min(1, x));
    this.debugMove.y = Math.max(-1, Math.min(1, y));
  }

  setDebugJump(held: boolean) {
    if (held && !this.jumpHeld) this.jumpPressed = true;
    this.jumpHeld = held;
  }

  triggerDebugDash() {
    this.dashPressed = true;
  }

  private setupTouch() {
    const zone = document.querySelector<HTMLElement>('#joystick')!;
    const knob = document.querySelector<HTMLElement>('#stick')!;
    const jump = document.querySelector<HTMLElement>('#jump')!;
    const dash = document.querySelector<HTMLElement>('#dash')!;
    this.knob = knob;
    let joystickId: number | null = null;
    let jumpId: number | null = null;

    const move = (event: PointerEvent) => {
      if (event.pointerId !== joystickId) return;
      const rect = zone.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const raw = Math.min(1, Math.hypot(dx, dy) / 42);
      const angle = Math.atan2(dy, dx);
      const deadzone = .13;
      const magnitude = raw <= deadzone ? 0 : (raw - deadzone) / (1 - deadzone);
      this.joy.x = Math.cos(angle) * magnitude;
      this.joy.y = -Math.sin(angle) * magnitude;
      knob.style.transform = `translate(${Math.cos(angle) * raw * 42}px,${Math.sin(angle) * raw * 42}px)`;
    };
    const releaseJoystick = (event?: PointerEvent) => {
      if (event && event.pointerId !== joystickId) return;
      joystickId = null;
      this.joy.x = this.joy.y = 0;
      knob.style.transform = '';
    };

    zone.onpointerdown = event => {
      event.preventDefault();
      joystickId = event.pointerId;
      zone.setPointerCapture(joystickId);
      move(event);
    };
    zone.onpointermove = move;
    zone.onpointerup = zone.onpointercancel = releaseJoystick;
    zone.onlostpointercapture = () => releaseJoystick();

    jump.onpointerdown = event => {
      event.preventDefault();
      jumpId = event.pointerId;
      jump.setPointerCapture(jumpId);
      this.jumpPressed = true;
      this.jumpHeld = true;
    };
    const releaseJump = (event?: PointerEvent) => {
      if (event && jumpId !== null && event.pointerId !== jumpId) return;
      jumpId = null;
      this.jumpHeld = false;
    };
    jump.onpointerup = jump.onpointercancel = releaseJump;
    jump.onlostpointercapture = () => releaseJump();
    dash.onpointerdown = event => { event.preventDefault(); this.dashPressed = true; };
  }
}
