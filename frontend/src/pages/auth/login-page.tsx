import { useEffect, useRef } from "react";
import LoginRegistration from "@/components/custom/LoginRegistration";
import { motion } from "framer-motion";
import { useAppSelector } from "@/app/hooks";
import { MessageSquare } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useAppSelector((state) => state.theme.theme);

  useEffect(() => {
    const canvas = canvasRef.current!;

    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;

    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();

    const particles: Particle[] = [];
    const particleCount = 50;

    class ParticleClass implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = theme === "light" ? "rgba(0, 0, 0, 0.5)" : "rgb(255, 255, 255,0.5)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new ParticleClass());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        particle.update();
        particle.draw(ctx);
      }
      requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [theme]);

  return (
    <div className="flex h-full">
      {/* Left Side with Animation */}
      <div className="relative items-center justify-center hidden w-1/2 lg:flex bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700">
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        <div className="relative z-10 max-w-md p-8 text-blue-900 dark:text-blue-100">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex items-center mb-6">
            <MessageSquare className="w-12 h-12 mr-4" />
            <h1 className="text-5xl font-bold leading-tight">MNK Chat</h1>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-xl">
            Connect with friends and family instantly. Join our community today!
          </motion.p>
        </div>
      </div>

      {/* Right Side for Login Form */}
      <div className="flex items-center justify-center w-full p-8 bg-white lg:w-1/2 dark:bg-neutral-800">
        <LoginRegistration />
      </div>
    </div>
  );
}
