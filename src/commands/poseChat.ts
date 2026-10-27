/** Per-pose Self / Other Action Text for /poses */

export type SeidrPoseChatSide = "self" | "other";

const FALLBACK: Record<SeidrPoseChatSide, string> = {
	self: "SourceCharacter changes PronounPossessive pose.",
	other: "SourceCharacter changes TargetCharacter's pose.",
};

/** Unique lines keyed by SEIDR_ACTION_POSES id. */
const SEIDR_POSE_CHAT: Record<string, Record<SeidrPoseChatSide, string>> = {
	BaseLower: {
		self: "SourceCharacter straightens PronounPossessive legs to stand.",
		other: "SourceCharacter helps TargetCharacter straighten TargetPronounPossessive legs to stand.",
	},
	LegsClosed: {
		self: "SourceCharacter presses PronounPossessive thighs together.",
		other: "SourceCharacter guides TargetCharacter to press TargetPronounPossessive thighs together.",
	},
	Kneel: {
		self: "SourceCharacter sinks down onto PronounPossessive knees.",
		other: "SourceCharacter guides TargetCharacter down onto TargetPronounPossessive knees.",
	},
	KneelingSpread: {
		self: "SourceCharacter kneels and spreads PronounPossessive knees apart.",
		other: "SourceCharacter spreads TargetCharacter's knees while TargetCharacter kneels.",
	},
	BaseUpper: {
		self: "SourceCharacter lets PronounPossessive arms hang relaxed at PronounPossessive sides.",
		other: "SourceCharacter eases TargetCharacter's arms down to hang relaxed.",
	},
	Yoked: {
		self: "SourceCharacter folds PronounPossessive arms behind PronounPossessive head.",
		other: "SourceCharacter folds TargetCharacter's arms behind TargetCharacter's head.",
	},
	OverTheHead: {
		self: "SourceCharacter raises PronounPossessive hands high above PronounPossessive head.",
		other: "SourceCharacter lifts TargetCharacter's hands high above TargetCharacter's head.",
	},
	BackBoxTie: {
		self: "SourceCharacter draws PronounPossessive arms back into a box-tie behind PronounSelf.",
		other: "SourceCharacter draws TargetCharacter's arms back into a box-tie behind TargetCharacter.",
	},
	BackElbowTouch: {
		self: "SourceCharacter pulls PronounPossessive elbows together behind PronounPossessive back.",
		other: "SourceCharacter pulls TargetCharacter's elbows together behind TargetCharacter's back.",
	},
	AllFours: {
		self: "SourceCharacter drops onto all fours.",
		other: "SourceCharacter puts TargetCharacter down onto all fours.",
	},
};

export function seidrPoseChatTemplate(poseId: string, side: SeidrPoseChatSide): string {
	const entry = SEIDR_POSE_CHAT[String(poseId || "")];
	if (entry && entry[side]) return entry[side];
	return FALLBACK[side];
}
