export default class StateMachine {
    constructor(game) {
        this.game = game;
        this.currentState = null;
        this.states = {};
    }

    add(name, state) {
        this.states[name] = state;
    }

    change(name, params = {}) {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }

        this.currentState = this.states[name];

        if (this.currentState && this.currentState.enter) {
            this.currentState.enter(params);
        }
    }

    update(dt) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(dt);
        }
    }

    render(ctx) {
        if (this.currentState && this.currentState.render) {
            this.currentState.render(ctx);
        }
    }
}
