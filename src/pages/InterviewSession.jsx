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

import Talkify from "talkify-tts";

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
  // TALKIFY TTS
  // ============================================================

  const playerRef = useRef(null);

  /*
   * Used to invalidate old playback.
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
  // INITIALIZE TALKIFY
  // ============================================================

  useEffect(() => {
    try {
      /*
       * IMPORTANT:
       *
       * talkify-tts exposes Html5Player as a named export.
       */
      const player = new Html5Player();

      playerRef.current = player;

      /*
       * Default voice settings.
       */
      player.setRate(1);
      player.setVolume(1);
      player.usePitch(1);

      console.log(
        "Talkify Html5Player initialized"
      );
    } catch (err) {
      console.error(
        "Talkify initialization error:",
        err
      );

      setError(
        "Unable to initialize interviewer voice."
      );
    }

    return () => {
      speechRequestRef.current += 1;

      try {
        playerRef.current?.pause();
      } catch (err) {
        console.warn(
          "Talkify cleanup warning:",
          err
        );
      }

      /*
       * Cancel browser speech as an additional
       * cleanup safeguard.
       */
      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          console.warn(
            "Speech synthesis cleanup warning:",
            err
          );
        }
      }

      playerRef.current = null;
    };
  }, []);

  // ============================================================
  // STOP TALKIFY
  // ============================================================

  const stopTTS = () => {
    /*
     * Invalidate previous playback.
     */
    speechRequestRef.current += 1;

    const player = playerRef.current;

    if (player) {
      try {
        player.pause();
      } catch (err) {
        console.warn(
          "Talkify pause error:",
          err
        );
      }
    }

    /*
     * Talkify Html5Player uses browser speech.
     *
     * Cancel any current browser utterance so an old
     * question cannot continue.
     */
    if (
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn(
          "Speech synthesis cancel error:",
          err
        );
      }
    }

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

    const player = playerRef.current;

    if (!player) {
      setError(
        "Interviewer voice is not initialized yet."
      );
      return;
    }

    /*
     * Stop old speech first.
     */
    stopTTS();

    /*
     * New playback request.
     */
    const requestId =
      ++speechRequestRef.current;

    setError("");
    setTtsSpeaking(false);
    setTtsPaused(false);

    try {
      console.log(
        "TALKIFY PLAY:",
        cleanText
      );

      /*
       * Apply current rate.
       */
      player.setRate(ttsRate);

      /*
       * Talkify Html5Player.
       */
      player.playText(cleanText);

      /*
       * Make sure this request is still current.
       */
      if (
        speechRequestRef.current !==
        requestId
      ) {
        return;
      }

      setTtsSpeaking(true);
      setTtsPaused(false);
    } catch (err) {
      console.error(
        "Talkify TTS error:",
        err
      );

      if (
        speechRequestRef.current !==
        requestId
      ) {
        return;
      }

      setTtsSpeaking(false);
      setTtsPaused(false);

      setError(
        err?.message ||
          "Unable to play interviewer voice."
      );
    }
  };

  // ============================================================
  // PAUSE TALKIFY
  // ============================================================

  const pauseTTS = () => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      player.pause();

      setTtsPaused(true);
      setTtsSpeaking(true);
    } catch (err) {
      console.error(
        "Talkify pause error:",
        err
      );
    }
  };

  // ============================================================
  // RESUME TALKIFY
  // ============================================================

  const resumeTTS = () => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      player.play();

      setTtsPaused(false);
      setTtsSpeaking(true);
    } catch (err) {
      console.error(
        "Talkify resume error:",
        err
      );
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
     * Speaking → pause.
     */
    if (
      ttsSpeaking &&
      !ttsPaused
    ) {
      pauseTTS();
      return;
    }

    /*
     * Paused → resume.
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

    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      player.setRate(rate);
    } catch (err) {
      console.error(
        "Talkify rate error:",
        err
      );
    }
  };

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
      listening
    ) {
      return;
    }

    /*
     * Already auto-read this question.
     */
    if (
      autoReadQuestionRef.current ===
      question
    ) {
      return;
    }

    autoReadQuestionRef.current =
      question;

    console.log(
      "TALKIFY AUTO PLAY:",
      question
    );

    /*
     * Small delay so the question state/render
     * settles before speech starts.
     */
    const timer = window.setTimeout(() => {
      if (!listening) {
        speakQuestion(question);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    question,
    autoRead,
    listening,
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
     * VERY IMPORTANT:
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

      try {
        playerRef.current?.pause();
      } catch (err) {
        console.warn(
          "Talkify unmount cleanup:",
          err
        );
      }

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
                TALKIFY CONTROLS
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
                  listening
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
                  listening
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
                />

                Read questions
                automatically
              </label>

            </div>

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
                Talkify
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
