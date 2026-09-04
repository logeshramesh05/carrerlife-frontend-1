import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechSynthesis() {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);

  const voicesRef = useRef([]);
  const utteranceRef = useRef(null);

  /*
   * Every new speech request gets a unique ID.
   * This prevents old callbacks from modifying
   * the state of a newer utterance.
   */
  const speechIdRef = useRef(0);

  /*
   * Prevent duplicate requests for the same text.
   */
  const lastSpokenTextRef = useRef("");

  // ============================================================
  // LOAD VOICES
  // ============================================================

  useEffect(() => {
    if (!supported) {
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();

      if (!list || list.length === 0) {
        return;
      }

      voicesRef.current = list;
      setVoices(list);

      const defaultVoice = list.find(
        (voice) => voice.default === true
      );

      console.log(
        "TTS voices:",
        list.length
      );

      if (defaultVoice) {
        console.log(
          "TTS default voice:",
          defaultVoice.name,
          defaultVoice.lang
        );
      }
    };

    /*
     * Some browsers provide voices immediately.
     */
    loadVoices();

    /*
     * Chrome often provides them later.
     */
    synth.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      synth.removeEventListener(
        "voiceschanged",
        loadVoices
      );
    };
  }, [supported]);

  // ============================================================
  // SPEAK
  // ============================================================

  const speak = useCallback(
    (text) => {
      if (!supported) {
        console.warn(
          "Speech synthesis is not supported."
        );
        return false;
      }

      const cleanText =
        text?.trim();

      if (!cleanText) {
        return false;
      }

      const synth =
        window.speechSynthesis;

      /*
       * IMPORTANT:
       *
       * If exactly the same text is already
       * speaking or pending, do not queue it again.
       */
      if (
        lastSpokenTextRef.current ===
          cleanText &&
        (synth.speaking ||
          synth.pending)
      ) {
        console.log(
          "TTS duplicate blocked"
        );

        return false;
      }

      /*
       * Mark this text immediately.
       *
       * This happens BEFORE the asynchronous
       * queue operation.
       */
      lastSpokenTextRef.current =
        cleanText;

      /*
       * Invalidate all previous utterances.
       */
      const speechId =
        ++speechIdRef.current;

      /*
       * Cancel existing speech only when
       * something is actually active.
       */
      if (
        synth.speaking ||
        synth.pending ||
        synth.paused
      ) {
        synth.cancel();
      }

      /*
       * Always get the latest voice list.
       */
      const availableVoices =
        synth.getVoices();

      if (
        availableVoices.length > 0
      ) {
        voicesRef.current =
          availableVoices;

        setVoices(
          availableVoices
        );
      }

      /*
       * Browser / OS DEFAULT VOICE
       *
       * First preference:
       * voice.default === true
       *
       * Then sensible language fallback.
       */
      const defaultVoice =
        availableVoices.find(
          (voice) =>
            voice.default === true
        ) ||
        availableVoices.find(
          (voice) =>
            /^en-IN$/i.test(
              voice.lang
            )
        ) ||
        availableVoices.find(
          (voice) =>
            /^en-/i.test(
              voice.lang
            )
        ) ||
        null;

      if (defaultVoice) {
        console.log(
          "TTS using voice:",
          defaultVoice.name,
          defaultVoice.lang
        );
      } else {
        console.log(
          "TTS using browser default voice"
        );
      }

      const utterance =
        new SpeechSynthesisUtterance(
          cleanText
        );

      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;

      /*
       * Only assign a voice when the browser
       * actually exposes one.
       */
      if (defaultVoice) {
        utterance.voice =
          defaultVoice;

        utterance.lang =
          defaultVoice.lang;
      } else {
        /*
         * Let browser choose its own voice.
         */
        utterance.lang =
          "en-IN";
      }

      // --------------------------------------------------------
      // START
      // --------------------------------------------------------

      utterance.onstart = () => {
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        console.log(
          "TTS START"
        );

        setSpeaking(true);
        setPaused(false);
      };

      // --------------------------------------------------------
      // PAUSE
      // --------------------------------------------------------

      utterance.onpause = () => {
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        console.log(
          "TTS PAUSE"
        );

        setPaused(true);
      };

      // --------------------------------------------------------
      // RESUME
      // --------------------------------------------------------

      utterance.onresume = () => {
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        console.log(
          "TTS RESUME"
        );

        setPaused(false);
      };

      // --------------------------------------------------------
      // END
      // --------------------------------------------------------

      utterance.onend = () => {
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        console.log(
          "TTS END"
        );

        setSpeaking(false);
        setPaused(false);

        utteranceRef.current =
          null;

        /*
         * Allow this text to be spoken
         * again manually later.
         */
        lastSpokenTextRef.current =
          "";
      };

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      utterance.onerror = (event) => {
        /*
         * Chrome/Safari can emit these when
         * speech is intentionally cancelled.
         *
         * They are NOT application errors.
         */
        if (
          event.error !==
            "canceled" &&
          event.error !==
            "interrupted"
        ) {
          console.error(
            "TTS ERROR:",
            event.error
          );
        } else {
          console.log(
            "TTS canceled/interrupted"
          );
        }

        /*
         * Ignore callbacks from old utterances.
         */
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        setSpeaking(false);
        setPaused(false);

        utteranceRef.current =
          null;

        lastSpokenTextRef.current =
          "";
      };

      utteranceRef.current =
        utterance;

      /*
       * Chrome is more reliable if speak()
       * happens after cancel() has completed.
       */
      window.setTimeout(() => {
        if (
          speechId !==
          speechIdRef.current
        ) {
          return;
        }

        console.log(
          "TTS QUEUE"
        );

        synth.speak(
          utterance
        );

        /*
         * Recover if the browser is
         * unexpectedly left paused.
         */
        if (synth.paused) {
          synth.resume();
        }
      }, 50);

      return true;
    },
    [supported, rate]
  );

  // ============================================================
  // PAUSE
  // ============================================================

  const pause = useCallback(() => {
    if (!supported) {
      return;
    }

    const synth =
      window.speechSynthesis;

    if (
      synth.speaking &&
      !synth.paused
    ) {
      synth.pause();
    }
  }, [supported]);

  // ============================================================
  // RESUME
  // ============================================================

  const resume = useCallback(() => {
    if (!supported) {
      return;
    }

    const synth =
      window.speechSynthesis;

    if (synth.paused) {
      synth.resume();
    }
  }, [supported]);

  // ============================================================
  // STOP
  // ============================================================

  const stop = useCallback(() => {
    if (!supported) {
      return;
    }

    /*
     * Invalidate all pending callbacks.
     */
    ++speechIdRef.current;

    window.speechSynthesis.cancel();

    utteranceRef.current =
      null;

    lastSpokenTextRef.current =
      "";

    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (!supported) {
        return;
      }

      ++speechIdRef.current;

      window.speechSynthesis.cancel();

      utteranceRef.current =
        null;
    };
  }, [supported]);

  return {
    supported,
    voices,
    speaking,
    paused,
    rate,
    setRate,
    speak,
    pause,
    resume,
    stop,
  };
}