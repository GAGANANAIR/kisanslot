// Web Audio API chime & Web Speech API loudspeaker voice synthesis
export function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Airport / Boarding Gate Chime (587.33 Hz D5 -> 880 Hz A5)
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.setValueAtTime(880.0, ctx.currentTime + 0.28);

    osc2.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.9);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (e) {
    console.log("Audio alert blocked by autoplay policy until user gesture", e);
  }
}

/**
 * Loudspeaker voice announcement using browser native SpeechSynthesis
 * Announces: "Attention please: Token <X>, <Farmer Name>, proceed to Counter <Y>"
 */
export function announceTokenCall(tokenNumber, farmerName, counterNumber) {
  try {
    playChime();

    if ('speechSynthesis' in window) {
      setTimeout(() => {
        window.speechSynthesis.cancel();
        const text = `Attention please. Token number ${tokenNumber}, ${farmerName}, please proceed to Weighbridge Counter ${counterNumber}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92; // Clear, dignified announcement cadence
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }, 500); // Trigger after initial chime finishes
    }
  } catch (e) {
    console.log("Speech announcement not available or blocked", e);
  }
}
