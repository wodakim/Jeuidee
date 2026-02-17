export default class Social {
    constructor() {}

    static exportCreature(creature) {
        // Serialize creature configuration to Base64
        const data = {
            parts: creature.parts,
            color: creature.color,
            name: "Jelly-" + Math.floor(Math.random()*1000)
        };
        const json = JSON.stringify(data);
        return btoa(json);
    }

    static importCreature(code) {
        try {
            const json = atob(code);
            const data = JSON.parse(json);
            return data;
        } catch (e) {
            console.error("Invalid DNA Code", e);
            return null;
        }
    }

    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert("DNA Copied to Clipboard!");
        }).catch(err => {
            console.error('Async: Could not copy text: ', err);
            // Fallback for some mobile browsers if needed, but modern API usually works in secure contexts
            prompt("Copy this DNA:", text);
        });
    }
}
