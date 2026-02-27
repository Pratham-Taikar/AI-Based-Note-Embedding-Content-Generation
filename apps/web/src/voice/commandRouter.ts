export type VoiceCommand =
  | { type: "ASK"; payload: { question: string } }
  | { type: "GEN_MCQ" }
  | { type: "GEN_SHORT" }
  | { type: "MODE_QA" }
  | { type: "MODE_STUDY" }
  | { type: "STOP" };

export type ParsedVoice =
  | { kind: "command"; command: VoiceCommand }
  | { kind: "dictation"; text: string };

const normalize = (input: string): string => input.trim().toLowerCase();

export const parseVoiceCommand = (transcript: string): ParsedVoice => {
  const raw = transcript.trim();
  if (!raw) {
    return { kind: "dictation", text: "" };
  }

  const t = normalize(raw);

  if (t.startsWith("ask ")) {
    const question = raw.slice(4).trim();
    if (question.length > 0) {
      return {
        kind: "command",
        command: { type: "ASK", payload: { question } },
      };
    }
  }

  if (t === "generate mcq" || t === "generate mcqs") {
    return { kind: "command", command: { type: "GEN_MCQ" } };
  }

  if (t === "generate short answer" || t === "generate short answers") {
    return { kind: "command", command: { type: "GEN_SHORT" } };
  }

  if (t === "switch to qa mode" || t === "switch to q and a mode") {
    return { kind: "command", command: { type: "MODE_QA" } };
  }

  if (t === "switch to study mode") {
    return { kind: "command", command: { type: "MODE_STUDY" } };
  }

  if (t === "stop listening" || t === "stop") {
    return { kind: "command", command: { type: "STOP" } };
  }

  return { kind: "dictation", text: raw };
};

