import { GameScene } from "./Scenes/game-scene.js";

//const scene = new GameScene();

console.log("--> Enter Phaser Game");

const config = {
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: "#2d2d2d",
    type: Phaser.AUTO,
    scene: GameScene,
    width: 800,
    height: 600 
};

const game = new Phaser.Game(config);