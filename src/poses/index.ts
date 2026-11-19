/** Dialog pose picker — other characters only */
import { Seidr } from "../seidr";
import {
	seidrPoseAfterDialogMenubar,
	seidrPoseDestroyUi,
	seidrPoseDialogLeave,
	seidrPoseDialogTick,
	seidrPoseDrawButton,
	seidrPoseTryClick,
} from "./ui";

let installed = false;

function drawAfter(args: unknown[], next: (a: unknown[]) => unknown): unknown {
	const ret = next(args);
	try { seidrPoseDrawButton(); } catch (e) { /* ignore */ }
	try { seidrPoseDialogTick(); } catch (e2) { /* ignore */ }
	return ret;
}

function tickAfter(args: unknown[], next: (a: unknown[]) => unknown): unknown {
	const ret = next(args);
	try { seidrPoseDialogTick(); } catch (e) { /* ignore */ }
	return ret;
}

export function seidrInstallPoses(): void {
	if (installed) return;
	installed = true;

	// Drawing.js: when CurrentCharacter != null, DialogDraw runs every frame (screen stays ChatRoom).
	// Draw inside this frame so HoveringText queues before DrawProcessHoverElements.
	Seidr.tryHook("DialogDraw", "DialogDraw", 5, drawAfter);
	// Backup when draw is throttled (background tab) or mode/focus changes — panel only.
	Seidr.tryHook("seidrPoseCharacterSetCurrent", "CharacterSetCurrent", 5, tickAfter);
	Seidr.tryHook("seidrPoseDialogChangeMode", "DialogChangeMode", 5, tickAfter);
	Seidr.tryHook("seidrPoseDialogChangeFocus", "DialogChangeFocusToGroup", 5, tickAfter);

	Seidr.tryHook("seidrPoseDialogMenuClick", "DialogMenuButtonClick", 5, function (
		args: unknown[],
		next: (a: unknown[]) => unknown,
	): unknown {
		try {
			if (seidrPoseTryClick()) return true;
		} catch (e) { /* ignore */ }
		return next(args);
	});

	// Dialog intro menubar is HTML; Club replaceChildren on reload — remount Positions.
	Seidr.tryHook(
		"seidrPoseDialogMenubar",
		"DialogMenuMapping.dialog._ReloadMenubar",
		5,
		function (args: unknown[], next: (a: unknown[]) => unknown): unknown {
			const ret = next(args);
			try { seidrPoseAfterDialogMenubar(); } catch (e) { /* ignore */ }
			return ret;
		},
	);

	Seidr.tryHook("seidrPoseDialogLeave", "DialogLeave", 0, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const ret = next(args);
		try { seidrPoseDialogLeave(); } catch (e) { /* ignore */ }
		return ret;
	});
}

Seidr.installPoses = seidrInstallPoses;
Seidr.poseDestroyUi = seidrPoseDestroyUi;
Seidr.poseDialogTick = seidrPoseDialogTick;
