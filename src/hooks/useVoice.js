import { useState, useRef, useCallback } from 'react'

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const alwaysOnCbRef = useRef(null)
  const alwaysOnActiveRef = useRef(false)
  const restartTimerRef = useRef(null)

  const clearRec = useCallback(() => {
    clearTimeout(restartTimerRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
  }, [])

  const startRec = useCallback((cb) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    clearRec()
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    recognitionRef.current = rec

    rec.onstart = () => setIsListening(true)
    rec.onend = () => {
      setIsListening(false)
      // Auto-restart only if always-on is still active (not paused for TTS or stopped)
      if (alwaysOnActiveRef.current && alwaysOnCbRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (alwaysOnActiveRef.current && alwaysOnCbRef.current) startRec(alwaysOnCbRef.current)
        }, 350)
      }
    }
    rec.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'aborted' || e.error === 'not-allowed') return
      if (alwaysOnActiveRef.current && alwaysOnCbRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (alwaysOnActiveRef.current && alwaysOnCbRef.current) startRec(alwaysOnCbRef.current)
        }, 800)
      }
    }
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      if (e.results[e.results.length - 1].isFinal) cb(text, null)
    }
    try { rec.start() } catch {}
  }, [clearRec])

  // speak() returns a Promise, auto-pauses/resumes always-on listening
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return Promise.resolve()
    window.speechSynthesis.cancel()

    // Capture always-on state, then pause it while speaking
    const wasAlwaysOn = alwaysOnActiveRef.current
    if (wasAlwaysOn) {
      alwaysOnActiveRef.current = false
      clearRec()
      setIsListening(false)
    }

    return new Promise((resolve) => {
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 1.08
      utt.pitch = 1.0
      utt.lang = 'en-US'
      utt.onstart = () => setIsSpeaking(true)
      const finish = () => {
        setIsSpeaking(false)
        resolve()
        // Resume always-on after speech
        if (wasAlwaysOn && alwaysOnCbRef.current) {
          alwaysOnActiveRef.current = true
          restartTimerRef.current = setTimeout(() => {
            if (alwaysOnActiveRef.current && alwaysOnCbRef.current) startRec(alwaysOnCbRef.current)
          }, 500)
        }
      }
      utt.onend = finish
      utt.onerror = finish
      window.speechSynthesis.speak(utt)
    })
  }, [clearRec, startRec])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    // Resume always-on after manual skip
    if (alwaysOnActiveRef.current && alwaysOnCbRef.current) {
      restartTimerRef.current = setTimeout(() => {
        if (alwaysOnActiveRef.current && alwaysOnCbRef.current) startRec(alwaysOnCbRef.current)
      }, 400)
    } else if (alwaysOnCbRef.current) {
      // Was paused by speak() — resume it
      alwaysOnActiveRef.current = true
      restartTimerRef.current = setTimeout(() => {
        if (alwaysOnActiveRef.current && alwaysOnCbRef.current) startRec(alwaysOnCbRef.current)
      }, 400)
    }
  }, [startRec])

  const startAlwaysOn = useCallback((cb) => {
    alwaysOnCbRef.current = cb
    alwaysOnActiveRef.current = true
    startRec(cb)
  }, [startRec])

  const stopAlwaysOn = useCallback(() => {
    alwaysOnActiveRef.current = false
    alwaysOnCbRef.current = null
    clearRec()
    setIsListening(false)
  }, [clearRec])

  // One-shot (legacy, used for manual tap-to-speak if needed)
  const startListening = useCallback((cb) => {
    alwaysOnActiveRef.current = false
    startRec(cb)
  }, [startRec])

  const stopListening = useCallback(() => {
    alwaysOnActiveRef.current = false
    clearRec()
    setIsListening(false)
  }, [clearRec])

  return {
    speak, stopSpeaking,
    startListening, stopListening,
    startAlwaysOn, stopAlwaysOn,
    isSpeaking, isListening,
  }
}
