/** Dialog pose picker — other characters only */
import { Seidr } from "../seidr";
import { seidrPoseDestroyUi, seidrPoseDialogLeave, seidrPoseDialogTick } from "./ui";

let installed = false;

function tickAfter(args: unknown[], next: (a: unknown[]) => unknown): unknown {
	const ret = next(args);
	try { seidrPoseDialogTick(); } catch (e) { /* ignore */ }
	return ret;
}

export function seidrInstallPoses(): void {
	if (installed) return;
	installed = true;

	// Drawing.js: when CurrentCharacter != null, DialogDraw runs every frame (screen stays ChatRoom).
	Seidr.tryHook("DialogDraw", "DialogDraw", 5, tickAfter);
	// Backup when draw is throttled (background tab) or mode/focus changes.
	Seidr.tryHook("seidrPoseCharacterSetCurrent", "CharacterSetCurrent", 5, tickAfter);
	Seidr.tryHook("seidrPoseDialogChangeMode", "DialogChangeMode", 5, tickAfter);
	Seidr.tryHook("seidrPoseDialogChangeFocus", "DialogChangeFocusToGroup", 5, tickAfter);

	Seidr.tryHook("seidrPoseDialogLeave", "DialogLeave", 0, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const ret = next(args);
		try { seidrPoseDialogLeave(); } catch (e) { /* ignore */ }
		return ret;
	});
}

Seidr.installPoses = seidrInstallPoses;
Seidr.poseDestroyUi = seidrPoseDestroyUi;
Seidr.poseDialogTick = seidrPoseDialogTick;
