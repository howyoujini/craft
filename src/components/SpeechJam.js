// SpeechJam.js
// 전체 흐름:
// 1. 음성 인식 시작 → 무음 감지 시 자동 종료 → 텍스트를 GPT-4o로 전송
// 2. 응답 텍스트를 받아서 화면에 출력하고, 입자 애니메이션 텍스트로 표현
// 3. 마우스에 반응하는 인터랙티브 p5.js 비주얼 생성

import axios from 'axios';
import p5 from 'p5';
import { useEffect, useRef, useState, useCallback } from 'react';
import './SpeechJam.css';

export default function SpeechJam() {
  // 상태 정의
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 레퍼런스 정의
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecognitionActive = useRef(false);
  const silenceTimeoutRef = useRef(null);
  const manuallyStopped = useRef(false);
  const SILENCE_TIMEOUT_MS = 5000;

  // GPT 처리 로직 (OpenAI API)
  const processTextWithOpenAI = useCallback(async (text) => {
    if (!text) return;
    setLoading(true);
    // OpenAI 모델 목록: https://platform.openai.com/docs/models 
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: text },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_SPEECH_JAM_OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setProcessedText(response.data.choices[0].message.content);
    } catch (err) {
      setError(`Error processing with OpenAI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 무음 시 자동 종료 타이머 초기화
  const resetSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    silenceTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current && isRecognitionActive.current) {
        recognitionRef.current.abort();
      }
    }, SILENCE_TIMEOUT_MS);
  }, []);

  // 음성 인식 초기화 및 이벤트 핸들링
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onstart = () => {
      isRecognitionActive.current = true;
      setListening(true);
      manuallyStopped.current = false;
      resetSilenceTimeout();
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
      resetSilenceTimeout();
    };

    recognition.onend = () => {
      isRecognitionActive.current = false;
      setListening(false);
      if (transcript) processTextWithOpenAI(transcript);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (!manuallyStopped.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('재시작 실패:', e);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
      isRecognitionActive.current = false;
      setListening(false);
    };

    recognitionRef.current = recognition;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isRecognitionActive.current) recognition.abort();
    });

    return () => {
      document.removeEventListener('visibilitychange', () => {});
      recognition.abort();
    };
  }, [processTextWithOpenAI, transcript, resetSilenceTimeout]);

  // 음성 인식 토글
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      if (listening) {
        manuallyStopped.current = true;
        recognitionRef.current.stop();
      } else {
        setTranscript('');
        setProcessedText('');
        recognitionRef.current.start();
      }
    } catch (err) {
      setError(`음성 인식을 시작할 수 없습니다: ${err.message}`);
    }
  }, [listening]);

  // 파티클 클래스 정의
  const createParticleClass = useCallback((p) => {
    const _pcolors = [
      p.color(172, 9, 60), p.color(234, 79, 96), p.color(248, 135, 96),
      p.color(180, 147, 115), p.color(255, 220, 72), p.color(222, 215, 153),
      p.color(11, 119, 169), p.color(11, 156, 168), p.color(15, 209, 224),
      p.color(170, 215, 233), p.color(69, 61, 216), p.color(130, 88, 178),
      p.color(99, 28, 195), p.color(228, 218, 211),
    ];

    return class Particle {
      constructor() {
        this.destPosX = 0;
        this.destPosY = 0;
        this.currentPosX = p.random(p.width);
        this.currentPosY = p.random(p.height);
        this.size = p.random(6, 10);
        this.color = p.random(_pcolors);
      }

      setNewDestPos(pg) {
        let randX, randY, attempts = 0;
        while (attempts++ < 50) {
          randX = p.random(p.width);
          randY = p.random(p.height);
          if (pg.get(randX, randY)[0] < 100) break;
        }
        this.destPosX = p.floor(randX / 10) * 10 + 5;
        this.destPosY = p.floor(randY / 10) * 10 + 5;
      }

      update() {
        this.currentPosX += (this.destPosX - this.currentPosX) * 0.1;
        this.currentPosY += (this.destPosY - this.currentPosY) * 0.1;
        const d = p.dist(p.mouseX, p.mouseY, this.currentPosX, this.currentPosY);
        if (d < 80) {
          const force = 200 / (d + 1);
          const angle = p.atan2(this.currentPosY - p.mouseY, this.currentPosX - p.mouseX);
          this.currentPosX += p.cos(angle) * force;
          this.currentPosY += p.sin(angle) * force;
        }
      }

      display() {
        p.fill(this.color);
        p.noStroke();
        p.ellipse(this.currentPosX, this.currentPosY, this.size, this.size);
      }
    };
  }, []);

  // p5.js 애니메이션 초기화
  useEffect(() => {
    const createSketch = (p) => {
      let textToShow = '말해보세요';
      let pgraphics, particleArr = [], Particle;

      const updateText = (text) => {
        if (!pgraphics) return;
        pgraphics.background(255);
        pgraphics.fill(0);
        const len = text.length;
        const baseSize = p.min(p.width, p.height) * 0.6;
        const fontSize = len <= 2 ? baseSize * 0.8 : len <= 4 ? baseSize * 0.6 : len <= 10 ? baseSize * 0.4 : baseSize * 0.3;
        pgraphics.textSize(fontSize);
        pgraphics.text(text, p.width * 0.5, p.height * 0.5);
        particleArr.forEach(particle => particle.setNewDestPos(pgraphics));
      };

      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(canvasRef.current);
        canvas.style('display', 'block');
        pgraphics = p.createGraphics(p.width, p.height);
        pgraphics.textStyle(p.BOLD);
        pgraphics.textAlign(p.CENTER, p.CENTER);
        Particle = createParticleClass(p);
        particleArr = Array.from({ length: 10000 }, () => new Particle());
        updateText(textToShow);
      };

      p.draw = () => {
        p.background(255);
        particleArr.forEach(p => { p.update(); p.display(); });
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        pgraphics.resizeCanvas(p.width, p.height);
        updateText(textToShow);
      };

      p.updateDisplayText = (text) => {
        textToShow = text || '말해보세요';
        updateText(textToShow);
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
  }, [createParticleClass]);

  // 텍스트 변경 시 애니메이션 업데이트
  useEffect(() => {
    if (p5InstanceRef.current?.updateDisplayText) {
      const text = transcript || processedText || '말해보세요';
      p5InstanceRef.current.updateDisplayText(text);
    }
  }, [transcript, processedText]);

  // UI 렌더링
  return (
    <div className="speech-assistant">
      <div className="controls-overlay">
        <button onClick={toggleListening} className={listening ? 'listening' : ''}>
          {listening ? '인식 중지' : '음성 인식 시작'}
        </button>
        {error && <div className="error">{error}</div>}
        {loading && <div className="loading">처리 중...</div>}
        {transcript && <div className="transcript-badge">{transcript}</div>}
      </div>
      <div className="canvas-container" ref={canvasRef}></div>
      {processedText && (
        <div className="processed-overlay">
          <p>{processedText}</p>
        </div>
      )}
    </div>
  );
}
