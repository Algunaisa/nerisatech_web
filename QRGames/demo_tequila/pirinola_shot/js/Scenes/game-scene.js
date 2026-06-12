export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
        console.log("--> GameScene constructor");
    }

    init(){
        console.log("--> GameScene init");
    }
    
    preload(){
        console.log("--> GameScene preload");

        this.load.image("background", "assets/background.png");
        this.load.image("player", "assets/crop_pumpkin.png");
        this.load.image("enemy", "assets/crop_melon.png");
    }
    
    create(){
        // Create bg image
        const bg = this.add.image(0, 0, "background");

        // change origin to the top-left corner
        bg.setOrigin(0, 0);

        this.player = this.add.image(70, 180, "player");
        this.player.setScale(0.5);

        
        this.enemy1 = this.add.image(250, 180, "enemy");
        this.enemy1.setRotation(Math.PI / 4);
    }

    create_2(){
        // Create bg image
        const bg = this.add.image(0, 0, "background");

        // change origin to the top-left corner
        bg.setOrigin(0, 0);

        const player = this.add.image(70, 180, "player");
        player.setScale(0.5);

        const enemy1 = this.add.image(250, 180, "enemy");
        //enemy1.angle = 45;
        //enemy1.rotation = Math.PI / 4;
        //enemy1.setRotation(Math.PI / 4);

        //para que gire sobre un determinado origen
        enemy1.setOrigin(0);
        enemy1.setRotation(Math.PI / 4);
    }

    create_1(){
        console.log("--> GameScene create");
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        console.log(`Game width: ${gameWidth}, Game height: ${gameHeight}`);

        const player = this.add.image(0, 0, "player");
        player.setPosition(gameWidth, gameHeight);
        player.setOrigin(1, 1);
        player.setDepth(2);
        player.setScale(2,2);

        
        const bg = this.add.image(0, 0, "background");
        bg.setPosition(gameWidth / 2, gameHeight / 2);
        //bg.setOrigin(0, 0);

        const enemy1 = this.add.image(250, 180, "enemy");
        enemy1.scaleX = 2;
        enemy1.scaleY = 2;

        enemy1.flipX = true;
        enemy1.flipY = true;

        const enemy2 = this.add.image(450, 180, "enemy");
        enemy2.displayWidth = 300;
    }
    
    update(){
        console.log("--> GameScene update");

        this.enemy1.angle += 1;   
        this.player.angle -= 1;  
        if(this.player.scaleX < 2)
        {
            this.player.scaleX += 0.01;
            this.player.scaleY += 0.01;
        }
    }
}
