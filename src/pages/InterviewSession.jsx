import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { submitAnswer } from "../api/interview";
import { Spinner } from "../components/Loader";
import ScorePill from "../components/ScorePill";

import useSpeechRecognition from "../hooks/useSpeechRecognition";

export default function InterviewSession() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ============================================================
  // INTERVIEW STATE
  // ============================================================

  const [question, setQuestion] = useState(
    location.state?.question || ""
  );

  const [questionIndex, setQuestionIndex] = useState(
    location.state?.questionIndex ?? 0
  );

  const [totalQuestions] = useState(
    location.state?.totalQuestions ?? 0
  );

  const [answer, setAnswer] = useState("");
  const [lastFeedback, setLastFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const [autoRead, setAutoRead] = useState(true);

  const [elapsed, setElapsed] = useState(0);
  const [interimOnly] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // SPEECH RECOGNITION
  // ============================================================

  const {
    supported,
    listening,
    transcript,
    interim,
    confidence,
    error: micError,
    start,
    stop,
    reset,
  } = useSpeechRecognition();

  // ============================================================
  // BROWSER TTS
  // ============================================================

  const speechRef = useRef(null);

  /*
   * Used to invalidate old speech requests.
   *
   * Question 1 starts speaking.
   * Question 2 arrives.
   * Question 1 must not continue.
   */
  const speechRequestRef = useRef(0);

  /*
   * Prevent duplicate automatic playback
   * for the same question.
   */
  const autoReadQuestionRef = useRef("");

  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);

  // ============================================================
  // BROWSER TTS SUPPORT
  // ============================================================

  const ttsSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  // ============================================================
  // STOP TTS
  // ============================================================

  const stopTTS = () => {
    /*
     * Invalidate any previous speech request.
     */
    speechRequestRef.current += 1;

    if (ttsSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn(
          "Speech synthesis cancel error:",
          err
        );
      }
    }

    speechRef.current = null;

    setTtsSpeaking(false);
    setTtsPaused(false);
  };

  // ============================================================
  // SPEAK QUESTION
  // ============================================================

  const speakQuestion = (text) => {
    const cleanText = text?.trim();

    if (!cleanText) {
      return;
    }

    /*
     * Never speak while candidate is using microphone.
     */
    if (listening) {
      return;
    }

    if (!ttsSupported) {
      setError(
        "Browser text-to-speech is not supported."
      );
      return;
    }

    /*
     * Stop any previous speech first.
     */
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn(
        "Speech cancellation warning:",
        err
      );
    }

    /*
     * Create a new speech request.
     */
    const requestId =
      ++speechRequestRef.current;

    const utterance =
      new SpeechSynthesisUtterance(
        cleanText
      );

    /*
     * Speech settings.
     */
    utterance.rate = ttsRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    /*
     * Optional:
     * Try to select a natural English voice.
     */
    const voices =
      window.speechSynthesis.getVoices();

    const preferredVoice =
      voices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith("en-us")
      ) ||
      voices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith("en-gb")
      ) ||
      voices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith("en")
      );

    if (preferredVoice) {
      utterance.voice =
        preferredVoice;
    }

    // ==========================================================
    // SPEECH START
    // ==========================================================

    utterance.onstart = () => {
      if (
        speechRequestRef.current !==
        requestId
      ) {
        return;
      }

      setTtsSpeaking(true);
      setTtsPaused(false);
      setError("");
    };

    // ==========================================================
    // SPEECH END
    // ==========================================================

    utterance.onend = () => {
      if (
        speechRequestRef.current !==
        requestId
      ) {
        return;
      }

      setTtsSpeaking(false);
      setTtsPaused(false);
      speechRef.current = null;
    };

    // ==========================================================
    // SPEECH ERROR
    // ==========================================================

    utterance.onerror = (event) => {
      /*
       * "canceled" is normal when we intentionally
       * stop old speech.
       */
      if (
        event.error === "canceled" ||
        event.error === "interrupted"
      ) {
        return;
      }

      console.error(
        "Browser TTS error:",
        event
      );

      if (
        speechRequestRef.current !==
        requestId
      ) {
        return;
      }

      setTtsSpeaking(false);
      setTtsPaused(false);
      speechRef.current = null;

      setError(
        "Unable to play interviewer voice."
      );
    };

    /*
     * Store current utterance.
     */
    speechRef.current = utterance;

    /*
     * Start browser TTS.
     */
    try {
      window.speechSynthesis.speak(
        utterance
      );
    } catch (err) {
      console.error(
        "Speech synthesis error:",
        err
      );

      setTtsSpeaking(false);
      setTtsPaused(false);
      speechRef.current = null;

      setError(
        err?.message ||
          "Unable to play interviewer voice."
      );
    }
  };

  // ============================================================
  // PAUSE TTS
  // ============================================================

  const pauseTTS = () => {
    if (!ttsSupported) {
      return;
    }

    if (
      window.speechSynthesis.speaking
    ) {
      try {
        window.speechSynthesis.pause();

        setTtsPaused(true);
        setTtsSpeaking(true);
      } catch (err) {
        console.error(
          "Speech pause error:",
          err
        );
      }
    }
  };

  // ============================================================
  // RESUME TTS
  // ============================================================

  const resumeTTS = () => {
    if (!ttsSupported) {
      return;
    }

    if (
      window.speechSynthesis.paused
    ) {
      try {
        window.speechSynthesis.resume();

        setTtsPaused(false);
        setTtsSpeaking(true);
      } catch (err) {
        console.error(
          "Speech resume error:",
          err
        );
      }
    }
  };

  // ============================================================
  // PLAY / PAUSE / RESUME
  // ============================================================

  const handlePlayQuestion = () => {
    if (!question || listening) {
      return;
    }

    /*
     * Currently speaking → pause.
     */
    if (
      ttsSpeaking &&
      !ttsPaused
    ) {
      pauseTTS();
      return;
    }

    /*
     * Currently paused → resume.
     */
    if (ttsPaused) {
      resumeTTS();
      return;
    }

    /*
     * Ready → speak.
     */
    speakQuestion(question);
  };

  // ============================================================
  // SPEECH RATE
  // ============================================================

  const handleRateChange = (rate) => {
    setTtsRate(rate);

    /*
     * If speech is currently playing,
     * restart it with the new rate.
     */
    if (
      ttsSpeaking &&
      question &&
      !listening
    ) {
      /*
       * Cancel current speech.
       */
      if (ttsSupported) {
        window.speechSynthesis.cancel();
      }

      setTtsSpeaking(false);
      setTtsPaused(false);

      /*
       * Restart with new speed.
       */
      setTimeout(() => {
        if (!listening) {
          speakQuestion(question);
        }
      }, 50);
    }
  };

  // ============================================================
  // LOAD BROWSER VOICES
  // ============================================================

  useEffect(() => {
    if (!ttsSupported) {
      return undefined;
    }

    /*
     * Some browsers load voices asynchronously.
     */
    const loadVoices = () => {
      const voices =
        window.speechSynthesis.getVoices();

      console.log(
        "Browser TTS voices:",
        voices.length
      );
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
      loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged =
        null;
    };
  }, [ttsSupported]);

  // ============================================================
  // QUESTION CHANGE
  // ============================================================

  useEffect(() => {
    setElapsed(0);
    setAnswer("");
    setError("");

    /*
     * Stop microphone when question changes.
     */
    if (listening) {
      stop();
    }

    /*
     * Stop previous question speech.
     */
    stopTTS();

    /*
     * Reset speech recognition.
     */
    reset();

    /*
     * New question gets a new auto-read opportunity.
     */
    autoReadQuestionRef.current = "";
  }, [question]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // AUTO READ
  // ============================================================

  useEffect(() => {
    if (
      !autoRead ||
      !question ||
      listening ||
      !ttsSupported
    ) {
      return undefined;
    }

    /*
     * Already auto-read this question.
     */
    if (
      autoReadQuestionRef.current ===
      question
    ) {
      return undefined;
    }

    autoReadQuestionRef.current =
      question;

    /*
     * Small delay so the question/render settles.
     */
    const timer = window.setTimeout(() => {
      if (!listening) {
        speakQuestion(question);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    question,
    autoRead,
    listening,
    ttsSupported,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // ANSWER TIMER
  // ============================================================

  useEffect(() => {
    if (!listening) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsed(
        (value) => value + 1
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [listening]);

  // ============================================================
  // SPEECH RECOGNITION → ANSWER
  // ============================================================

  useEffect(() => {
    if (
      transcript &&
      !interimOnly
    ) {
      setAnswer(transcript);
    }
  }, [
    transcript,
    interimOnly,
  ]);

  // ============================================================
  // DISPLAY ANSWER
  // ============================================================

  const displayAnswer = useMemo(() => {
    if (!interim) {
      return answer;
    }

    return `${answer}${
      answer ? " " : ""
    }${interim}`;
  }, [
    answer,
    interim,
  ]);

  // ============================================================
  // PROGRESS
  // ============================================================

  const progressPct = totalQuestions
    ? Math.min(
        100,
        ((questionIndex + 1) /
          totalQuestions) *
          100
      )
    : 0;

  // ============================================================
  // TIME
  // ============================================================

  const timeLabel = `${String(
    Math.floor(elapsed / 60)
  ).padStart(2, "0")}:${String(
    elapsed % 60
  ).padStart(2, "0")}`;

  // ============================================================
  // CONFIDENCE
  // ============================================================

  const confidenceLabel =
    confidence == null
      ? "—"
      : `${Math.round(
          confidence * 100
        )}%`;

  // ============================================================
  // MICROPHONE
  // ============================================================

  const toggleMic = async () => {
    setError("");

    /*
     * Stop listening.
     */
    if (listening) {
      stop();
      return;
    }

    /*
     * IMPORTANT:
     *
     * Stop interviewer TTS before microphone starts.
     *
     * This prevents the microphone from hearing
     * the interviewer.
     */
    stopTTS();

    try {
      await start();
    } catch (err) {
      console.error(
        "Microphone start error:",
        err
      );

      setError(
        err?.message ||
          "Unable to start microphone."
      );
    }
  };

  // ============================================================
  // AUTO READ TOGGLE
  // ============================================================

  const handleAutoReadChange = (
    checked
  ) => {
    setAutoRead(checked);

    /*
     * Auto-read OFF.
     */
    if (!checked) {
      stopTTS();
      return;
    }

    /*
     * Allow current question to play again.
     */
    autoReadQuestionRef.current =
      "";

    /*
     * Start current question immediately.
     */
    if (
      question &&
      !listening
    ) {
      speakQuestion(question);
    }
  };

  // ============================================================
  // CLEAR ANSWER
  // ============================================================

  const handleClear = () => {
    setAnswer("");
    setError("");
    reset();
  };

  // ============================================================
  // SUBMIT ANSWER
  // ============================================================

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    const finalAnswer =
      answer.trim();

    if (!finalAnswer) {
      setError(
        "Please provide an answer before submitting."
      );

      return;
    }

    /*
     * Stop microphone.
     */
    if (listening) {
      stop();
    }

    /*
     * Stop interviewer speech.
     */
    stopTTS();

    setError("");
    setLoading(true);

    try {
      const data =
        await submitAnswer(
          sessionId,
          finalAnswer
        );

      /*
       * Save feedback.
       */
      setLastFeedback({
        score: data.score,
        feedback:
          data.feedback,
      });

      reset();

      /*
       * Interview completed.
       */
      if (
        data.status ===
          "COMPLETED" ||
        !data.nextQuestion
      ) {
        navigate(
          `/interview/${sessionId}/summary`
        );

        return;
      }

      /*
       * Move to next question.
       */
      setQuestion(
        data.nextQuestion
      );

      setQuestionIndex(
        data.nextQuestionIndex ??
          questionIndex + 1
      );
    } catch (err) {
      console.error(
        "Submit answer error:",
        err
      );

      setError(
        err.response?.data
          ?.message ||
          "Failed to submit answer"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CLEANUP ON UNMOUNT
  // ============================================================

  useEffect(() => {
    return () => {
      speechRequestRef.current += 1;

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          console.warn(
            "Speech cleanup:",
            err
          );
        }
      }

      speechRef.current = null;
    };
  }, []);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="page interview-page">

      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <div className="page-header">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-mark" />
            CAREERLIFE / INTERVIEW
          </p>

          <h2>
            Question{" "}
            {questionIndex + 1}

            {totalQuestions
              ? ` / ${totalQuestions}`
              : ""}
          </h2>

          <p className="page-sub">
            Listen, think, speak — then
            refine your answer.
          </p>
        </div>

        {lastFeedback && (
          <ScorePill
            score={
              lastFeedback.score
            }
          />
        )}
      </div>

      {/* ======================================================
          PROGRESS
      ======================================================= */}

      {totalQuestions > 0 && (
        <div
          className="progress-track"
          style={{
            marginBottom: 24,
          }}
        >
          <div
            className="progress-fill"
            style={{
              width: `${progressPct}%`,
            }}
          />
        </div>
      )}

      {/* ======================================================
          PREVIOUS FEEDBACK
      ======================================================= */}

      {lastFeedback && (
        <div className="feedback-box">
          <strong>
            Previous answer feedback
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text)",
            }}
          >
            {
              lastFeedback.feedback
            }
          </p>
        </div>
      )}

      <div className="interview-layout">

        <main>

          {/* ==================================================
              QUESTION CARD
          =================================================== */}

          <section className="question-card">

            <div className="question-meta">
              <span>
                INTERVIEWER
              </span>

              <span>
                Question{" "}
                {questionIndex + 1}
              </span>
            </div>

            <p className="question-text">
              {question ||
                "Your interview question will appear here."}
            </p>

            {/* =================================================
                BROWSER TTS CONTROLS
            ================================================== */}

            <div className="voice-controls">

              <button
                type="button"
                className="secondary voice-btn"
                onClick={
                  handlePlayQuestion
                }
                disabled={
                  !question ||
                  listening ||
                  !ttsSupported
                }
              >
                {ttsSpeaking
                  ? ttsPaused
                    ? "▶ Resume"
                    : "Ⅱ Pause"
                  : "▶ Play question"}
              </button>

              <button
                type="button"
                className="ghost voice-btn"
                onClick={stopTTS}
                disabled={
                  !ttsSpeaking &&
                  !ttsPaused
                }
              >
                ■ Stop
              </button>

              <select
                aria-label="Speech speed"
                value={ttsRate}
                onChange={(e) =>
                  handleRateChange(
                    Number(
                      e.target.value
                    )
                  )
                }
                disabled={
                  listening ||
                  !ttsSupported
                }
              >
                <option value="0.8">
                  Slow
                </option>

                <option value="1">
                  Natural
                </option>

                <option value="1.15">
                  Fast
                </option>

                <option value="1.3">
                  Very fast
                </option>
              </select>

              <label className="check-control">
                <input
                  type="checkbox"
                  checked={autoRead}
                  onChange={(e) =>
                    handleAutoReadChange(
                      e.target.checked
                    )
                  }
                  disabled={!ttsSupported}
                />

                Read questions
                automatically
              </label>

            </div>

            {!ttsSupported && (
              <p
                className="error"
                style={{
                  marginTop: 12,
                }}
              >
                Your browser does not support
                text-to-speech.
              </p>
            )}

          </section>

          {/* ==================================================
              ANSWER CARD
          =================================================== */}

          <section
            className={`answer-card ${
              listening
                ? "answer-card-live"
                : ""
            }`}
          >

            <div className="answer-head">

              <div>
                <span className="section-kicker">
                  YOUR ANSWER
                </span>

                <h3>
                  {listening
                    ? "Listening to you…"
                    : "Take your time"}
                </h3>
              </div>

              <span className="speech-time">
                {timeLabel}
              </span>

            </div>

            {/* =================================================
                SPEECH RECOGNITION
            ================================================== */}

            {supported && (
              <div className="stt-panel">

                <button
                  type="button"
                  className={`mic-btn ${
                    listening
                      ? "recording"
                      : ""
                  }`}
                  onClick={
                    toggleMic
                  }
                  disabled={loading}
                >
                  {listening
                    ? "■"
                    : "🎙"}
                </button>

                <div className="stt-copy">

                  <strong>
                    {listening
                      ? "Live speech recognition"
                      : "Answer with your voice"}
                  </strong>

                  <span>
                    {listening
                      ? "Speak naturally. Your words appear below."
                      : "Your transcript stays editable before you submit."}
                  </span>

                </div>

                <div
                  className="stt-meter"
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>

              </div>
            )}

            {/* =================================================
                ANSWER TEXTAREA
            ================================================== */}

            <textarea
              rows="8"
              placeholder="Type your answer, or use the microphone…"
              value={displayAnswer}
              onChange={(e) => {
                setAnswer(
                  e.target.value
                );

                if (listening) {
                  stop();
                }
              }}
              disabled={loading}
            />

            {/* =================================================
                ANSWER TOOLS
            ================================================== */}

            <div className="answer-tools">

              <span>
                {interim
                  ? "Listening…"
                  : "You can edit the transcript before submitting."}
              </span>

              <span>
                Recognition confidence:{" "}
                <b>
                  {confidenceLabel}
                </b>
              </span>

            </div>

            {/* =================================================
                ACTIONS
            ================================================== */}

            <div className="answer-actions">

              <button
                type="submit"
                form="answer-form"
                disabled={
                  loading ||
                  !answer.trim()
                }
              >
                {loading && (
                  <Spinner />
                )}

                {loading
                  ? "Submitting"
                  : "Submit answer →"}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={
                  handleClear
                }
                disabled={loading}
              >
                Clear
              </button>

            </div>

          </section>

          {/* ==================================================
              ERRORS
          =================================================== */}

          {(error ||
            micError) && (
            <p
              className="error"
              style={{
                marginTop: 16,
              }}
            >
              {error ||
                micError}
            </p>
          )}

        </main>

        {/* ====================================================
            SIDEBAR
        ===================================================== */}

        <aside className="interview-side">

          <div className="side-panel">

            <span className="section-kicker">
              VOICE SETUP
            </span>

            <h3>
              Before you begin
            </h3>

            <div className="setup-row">
              <span>
                Speaker
              </span>

              <b>
                Browser TTS
              </b>
            </div>

            <div className="setup-row">
              <span>
                Microphone
              </span>

              <b>
                {supported
                  ? "Ready"
                  : "Unavailable"}
              </b>
            </div>

            <div className="setup-row">
              <span>
                Auto-read
              </span>

              <b>
                {autoRead
                  ? "On"
                  : "Off"}
              </b>
            </div>

            <div className="setup-row">
              <span>
                Speech
              </span>

              <b>
                {ttsSpeaking
                  ? ttsPaused
                    ? "Paused"
                    : "Speaking"
                  : "Ready"}
              </b>
            </div>

          </div>

          <div className="side-panel interview-tip">

            <span className="section-kicker">
              A SMALL TIP
            </span>

            <h3>
              Think before speaking.
            </h3>

            <p>
              Take a breath, make
              your point, and support
              it with one concrete
              example. A clear answer
              beats a rushed one.
            </p>

          </div>

        </aside>

      </div>

      {/* ======================================================
          HIDDEN SUBMIT FORM
      ======================================================= */}

      <form
        id="answer-form"
        onSubmit={handleSubmit}
        hidden
      >
        <button type="submit" />
      </form>

    </div>
  );
}
