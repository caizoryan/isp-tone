import { Tone } from './tone.js'
import { render, mem, sig, eff_on, html } from './solid_monke/solid_monke.js'

let registered = {}

let synth = new Tone.Synth({
    envelope: {
        attack: 0.003,
        decay: 0.1,
        sustain: 0.05,
    }
}).toDestination();

let playing = false
let notes = sig(4)
let bpm = sig(60)
let beats = sig(2)
let ctx

let beat_count = sig(1)
let current_beat = () => buffers[beat_count() - 1]

let bpm_changed = function() {
    Tone.getTransport().bpm.value = bpm()
}

let length_changed = function() {
    let total_notes = beats() * notes()

    if (buffers.length < total_notes) {
        let diff = total_notes - buffers.length
        for (let i = 0; i < diff; i++) {
            buffers.push({ operation: null })
        }
    }
}

let buffers = Array.from({ length: beats() * notes() }, (_, i) => {
    return {
        operation: null
    }
})

const nextBeat = () => {
    beat_count.set(beat_count() + 1)
    if (beat_count() > beats() * notes()) {
        beat_count.set(1)
        ctx.clearRect(0, 0, 600, 900)
    }
}

const loop = new Tone.Loop((time) => {
    nextBeat()
    synth.triggerAttackRelease("E2", notes() + "n", time + 0.1);
    if (current_beat().operation) current_beat().operation(beat_count)

}, notes + "n").start(0);

function start() {
    play()
    Tone.getTransport().bpm.value = bpm();
    loop.interval = notes() + "n"
}

function pause() {
    playing = false
    Tone.getTransport().pause();

}

function play() {
    playing = true
    Tone.getTransport().start();
}

let note = (index) => {
    let s = mem(() => {
        if (beat_count() === index) return "background-color: white; color: black;"
        else return ""
    })

    return html`.note [style = ${s}] -- ${index}`
}

// div with notes, and an index of which beat
let beat_display = (index) => {
    let note_count = Array.from({ length: notes() }, (_, i) => {
        let prev_total_notes = (index - 1) * notes()
        return i + prev_total_notes + 1
    })

    return html`
            .beat
                each in ${note_count} as ${note}`
}

let items = [
    "text"
]


class Text {
    constructor(id, text) {
        this.id = id
        this._fillStyle = "blue"

        this._fontSize = "30px"
        this._fontStyle = "Arial"

        this._x = 10
        this._y = 50

        this._text = text

        this.operation_list = {
            "set_fillStyle": this.#set_fillStyle,
            "set_fontSize": this.#set_fontSize,
            "set_fontStyle": this.#set_fontStyle,
            "set_x": this.#set_x,
            "set_y": this.#set_y,
            "add_x": this.#add_x,
            "add_y": this.#add_y,
            "set_text": this.#set_text
        }
    }

    render() {
        console.log("rendering")
        ctx.fillStyle = this._fillStyle
        ctx.font = `${this._fontSize} ${this._fontStyle}`;
        ctx.fillText(this._text, this._x, this._y);
    }

    operation(action, ...args) {
        return () => { this.operation_list[action](...args); this.render() }
    }

    available_operations() {
        return Object.keys(this.operation_list)
    }

    remove() {
        delete registered[this.id]
    }

    // operations
    #set_fillStyle(color) {
        console.log("setting fill style")
        this._fillStyle = color
        console.log(this._fillStyle)
    }

    #set_fontSize(size) {
        this._fontSize = size
    }

    #set_fontStyle(style) {
        this._fontStyle = style
    }

    #set_x(x) {
        this._x = x
    }

    #set_y(y) {
        this._y = y
    }

    #add_x(x) {
        this._x += x
    }

    #add_y(y) {
        this._y += y
    }

    #set_text(text) {
        this._text = text
    }
}


let App = () => {
    let beat_counts = mem(() => Array.from({ length: beats() }, (_, i) => i + 1))

    return html`
        div -- ${settings()}
        .timeline
            each of ${beat_counts} as ${beat_display}
        canvas [width=600 height=900]`
}

let settings = () => {
    let settings_open = sig(false)
    return html`
        button.settings [onclick=${() => settings_open.set(!settings_open())}] -- Settings
        .settings [style=${mem(() => settings_open() ? "display: block;" : "display: none;")}]
            .widget 
               span -- BPM: ${bpm}
               input [type=range min=60 max=200 value=${bpm} oninput=${(e) => bpm.set(e.target.value)}]
            .widget
               span -- Beats: ${beats}
               input [type=range min=1 max=8 value=${beats} oninput${(e) => beats.set(e.target.value)}]
            .widget
                div -- Notes: ${notes}`
}

document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
        e.preventDefault()
        if (playing) pause()
        else start()
    }
    if (e.key === "p") {
        ctx.fillStyle = "red"
        ctx.fillRect(0, 0, 600, 900)

        current_beat().operation = (beat_count) => {
            ctx.fillStyle = "red"
            ctx.fillRect(0, 0, 600, 900)
        }
    }

    if (e.key === "c") {
        ctx.clearRect(0, 0, 600, 900)
        current_beat().operation = (beat_count) => {
            ctx.clearRect(0, 0, 600, 900)
        }
    }

    if (e.key === "d") {
        ctx.fillStyle = "pink"
        ctx.fillRect(0, 0, 600, 900)

        current_beat().operation = (beat_count) => {
            ctx.fillStyle = "pink"
            ctx.fillRect(0, 0, 600, 900)
        }
    }


    // if (e.key === "t") {
    //
    //         ctx.fillStyle = "blue"
    //         ctx.font = "30px Arial";
    //         ctx.fillText("Hello World", 10, 50);
    //
    //
    //     current_beat().operation = (beat_count) => {
    //         ctx.fillStyle = "blue"
    //         ctx.font = "30px Arial";
    //         ctx.fillText("Hello World", 10, 50);
    //     }
    // }

    if (e.key === "u") {
        registered[1].operation("set_fillStyle", "red")()

        current_beat().operation = (beat_count) =>
            registered[1].operation("set_fillStyle", "red")

    }

    if (e.key === "t") {

        current_beat().item ? current_beat().item.remove() : null

        let text = new Text(1, "Hello World")
        registered[text.id] = text
        current_beat().item = text

        current_beat().operation = (beat_count) => {
            text.render()
        }

        text.render()
    }
})

render(App, document.body)
setTimeout(() => ctx = document.querySelector("canvas").getContext("2d"), 100)
eff_on(notes, length_changed)
eff_on(beats, length_changed)
eff_on(bpm, bpm_changed)
