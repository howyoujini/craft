import React, { useEffect, useRef } from "react";
import p5 from "p5";

const IntroSection = () => {
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const keyPressTimeoutRef = useRef(null);

  useEffect(() => {
    const createSketch = (p) => {
      let chr = "Hello";
      let pgraphics;
      let particleNum = 3800;
      let particleArr = [];
      const _pcolors = [
        p.color(172, 9, 60), // 빨강
        p.color(234, 79, 96), // 분홍
        p.color(248, 135, 96), // 분홍
        p.color(180, 147, 115), // 황토
        p.color(255, 220, 72), // 노랑
        p.color(222, 215, 153), // 와사비
        p.color(11, 119, 169), // 바다
        p.color(11, 156, 168), // 청록
        p.color(15, 209, 224), // 하늘
        p.color(170, 215, 233), // 푸른 회색
        p.color(69, 61, 216), // 마린 블루
        p.color(130, 88, 178), // 연한 보라
        p.color(99, 28, 195), // 보라
        p.color(228, 218, 211), // 회색
      ];

      class Particle {
        constructor(destPosX, destPosY) {
          this.destPosX = destPosX;
          this.destPosY = destPosY;
          this.currentPosX = 0;
          this.currentPosY = 0;
          this.size = p.random(8, 10);
          this.color = p.random(_pcolors);
        }

        setNewDestPos(pg) {
          if (!pg) return;
          let randX, randY;
          do {
            randX = p.random(p.width);
            randY = p.random(p.height);
          } while (pg.get(randX, randY)[0] > 100);

          this.destPosX = p.floor(randX / 10) * 10 + 5;
          this.destPosY = p.floor(randY / 10) * 10 + 5;
        }

        display() {
          p.fill(this.color);
          p.ellipse(this.currentPosX, this.currentPosY, this.size, this.size);
        }

        update() {
          this.currentPosX += (this.destPosX - this.currentPosX) * 0.1;
          this.currentPosY += (this.destPosY - this.currentPosY) * 0.1;

          let d = p.dist(
            p.mouseX,
            p.mouseY,
            this.currentPosX,
            this.currentPosY
          );
          let force = 200 / (d + 1);
          let angle = p.atan2(
            this.currentPosY - p.mouseY,
            this.currentPosX - p.mouseX
          );
          this.currentPosX += p.cos(angle) * force;
          this.currentPosY += p.sin(angle) * force;
        }
      }

      const initializeParticles = async () => {
        particleArr = [];
        for (let i = 0; i < particleNum; i++) {
          let tempParticle = new Particle(0, 0);
          tempParticle.setNewDestPos(pgraphics);
          tempParticle.currentPosX = tempParticle.destPosX;
          tempParticle.currentPosY = tempParticle.destPosY;
          particleArr.push(tempParticle);
        }
      };

      const updateText = async () => {
        if (!pgraphics) return;
        pgraphics.background(255);
        pgraphics.fill(0);
        pgraphics.text(chr, p.width * 0.5, p.height * 0.55);

        for (let particle of particleArr) {
          particle.setNewDestPos(pgraphics);
        }
      };

      p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(canvasRef.current);
        pgraphics = p.createGraphics(p.width, p.height);
        pgraphics.textSize(p.min(p.width, p.height) * 0.6);
        pgraphics.textStyle(p.BOLD);
        pgraphics.textAlign(p.CENTER, p.CENTER);

        initializeParticles().then(updateText);
      };

      p.draw = () => {
        p.background(p.color(255, 255, 253), 20);
        p.noStroke();
        p.fill(160);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(16);
        p.text("MOVE AROUND", p.width * 0.5, p.height * 0.05);
        p.text(
          "TYPE A CHARACTER / RESET THROUGH ESC",
          p.width * 0.5,
          p.height * 0.07
        );

        for (let particle of particleArr) {
          particle.update();
          particle.display();
        }
      };

      p.keyPressed = async () => {
        if (keyPressTimeoutRef.current) return; // Prevent key input spamming

        keyPressTimeoutRef.current = true;

        // Handle special keys
        switch (p.keyCode) {
          case p.ESCAPE:
          case 13:
          case 16:
          case 17:
          case 18:
            chr = "Hello";
            particleNum = 3800;
            break;
          case p.DELETE:
          case p.BACKSPACE:
            chr = "Del";
            particleNum = 1800;
            break;
          case 20: // Caps Lock (could be interpreted as 한영키)
            chr = "안녕!";
            particleNum = 3800;
            break;
          case p.TAB:
          case p.SPACE:
          case 32:
            chr = "!";
            particleNum = 1000;
            break;
          default:
            chr = String.fromCharCode(p.keyCode);
            particleNum = 1800;
            break;
        }

        await initializeParticles();
        await updateText();

        keyPressTimeoutRef.current = false;
      };

      p.windowResized = () => {
        if (!pgraphics) return;
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        pgraphics.resizeCanvas(p.width, p.height);
        pgraphics.textSize(p.min(p.width, p.height) * 0.4);
        updateText();
      };
    };

    if (!p5InstanceRef.current) {
      p5InstanceRef.current = new p5(createSketch);
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{ width: "100%", height: "100%", lineHeight: 1.0 }}
    />
  );
};

export default IntroSection;
