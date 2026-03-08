import { useState } from "react";
import { BottomSheet, Button, Input } from "#/components/app/ui";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";

type AdminDialogsProps = {
	deleteTargetLabel: string | null;
	isShareSheetOpen: boolean;
	shareUrl: string;
	isSharing: boolean;
	isClearFormConfirmOpen: boolean;
	isAnnounceConfirmOpen: boolean;
	isAnnouncing: boolean;
	isUnpublishConfirmOpen: boolean;
	isUnpublishing: boolean;
	isClearMarkingsConfirmOpen: boolean;
	isClearingMarkings: boolean;
	isLockConfirmOpen: boolean;
	isLocking: boolean;
	isUnlockConfirmOpen: boolean;
	isUnlocking: boolean;
	isCancelChallengeConfirmOpen: boolean;
	isCancellingChallenge: boolean;
	challengeTitle: string;
	onDeleteTargetChange: (open: boolean) => void;
	onDeleteQuestion: () => void;
	onShareSheetChange: (open: boolean) => void;
	onShare: () => void;
	onClearFormConfirmChange: (open: boolean) => void;
	onClearForm: () => void;
	onAnnounceConfirmChange: (open: boolean) => void;
	onAnnounceWinners: () => void;
	onUnpublishConfirmChange: (open: boolean) => void;
	onUnpublish: () => void;
	onClearMarkingsConfirmChange: (open: boolean) => void;
	onClearAnswerMarkings: () => void;
	onLockConfirmChange: (open: boolean) => void;
	onLockPredictions: () => void;
	onUnlockConfirmChange: (open: boolean) => void;
	onUnlockPredictions: () => void;
	onCancelChallengeConfirmChange: (open: boolean) => void;
	onCancelChallenge: () => void;
};

export function AdminDialogs({
	deleteTargetLabel,
	isShareSheetOpen,
	shareUrl,
	isSharing,
	isClearFormConfirmOpen,
	isAnnounceConfirmOpen,
	isAnnouncing,
	isUnpublishConfirmOpen,
	isUnpublishing,
	isClearMarkingsConfirmOpen,
	isClearingMarkings,
	isLockConfirmOpen,
	isLocking,
	isUnlockConfirmOpen,
	isUnlocking,
	isCancelChallengeConfirmOpen,
	isCancellingChallenge,
	challengeTitle,
	onDeleteTargetChange,
	onDeleteQuestion,
	onShareSheetChange,
	onShare,
	onClearFormConfirmChange,
	onClearForm,
	onAnnounceConfirmChange,
	onAnnounceWinners,
	onUnpublishConfirmChange,
	onUnpublish,
	onClearMarkingsConfirmChange,
	onClearAnswerMarkings,
	onLockConfirmChange,
	onLockPredictions,
	onUnlockConfirmChange,
	onUnlockPredictions,
	onCancelChallengeConfirmChange,
	onCancelChallenge,
}: AdminDialogsProps) {
	return (
		<>
			<BottomSheet
				open={deleteTargetLabel !== null}
				onClose={() => onDeleteTargetChange(false)}
				title="Delete question?"
				description={
					deleteTargetLabel
						? `This removes "${deleteTargetLabel}" from the draft challenge.`
						: "This removes the pick card from the draft challenge."
				}
				footer={
					<>
						<Button
							variant="destructive"
							className="w-full"
							onClick={onDeleteQuestion}
						>
							Delete question
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onDeleteTargetChange(false)}
						>
							Keep it
						</Button>
					</>
				}
			/>

			<BottomSheet
				open={isShareSheetOpen}
				onClose={() => onShareSheetChange(false)}
				title="Share challenge"
				description="On mobile this uses the native share sheet. Desktop falls back to clipboard."
				footer={
					<>
						<Button className="w-full" onClick={onShare} disabled={isSharing}>
							{isSharing ? "Sharing..." : "Share now"}
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onShareSheetChange(false)}
						>
							Cancel
						</Button>
					</>
				}
			>
				<Input readOnly value={shareUrl} aria-label="Challenge share link" />
			</BottomSheet>

			<ConfirmDialog
				open={isClearFormConfirmOpen}
				onOpenChange={onClearFormConfirmChange}
				title="Clear form?"
				description="This only resets the question composer fields on this screen. It does not delete any saved challenge questions."
				cancelLabel="Keep editing"
				actionLabel="Yes, clear form"
				actionVariant="destructive"
				onAction={onClearForm}
			/>

			<ConfirmDialog
				open={isAnnounceConfirmOpen}
				onOpenChange={onAnnounceConfirmChange}
				title="Announce winners?"
				description="This will lock the challenge, snapshot the current top three, and switch players into the final results experience."
				cancelLabel="Not yet"
				actionLabel={isAnnouncing ? "Announcing..." : "Announce winners"}
				actionDisabled={isAnnouncing}
				onAction={onAnnounceWinners}
			/>

			<ConfirmDialog
				open={isUnpublishConfirmOpen}
				onOpenChange={onUnpublishConfirmChange}
				title="Unpublish questions?"
				description="This hides the challenge questions from players while you edit them. Republish once the updated question set is ready."
				cancelLabel="Keep published"
				actionLabel={isUnpublishing ? "Unpublishing..." : "Unpublish"}
				actionDisabled={isUnpublishing}
				onAction={onUnpublish}
			/>

			<ConfirmDialog
				open={isClearMarkingsConfirmOpen}
				onOpenChange={onClearMarkingsConfirmChange}
				title="Clear answer markings?"
				description="This will remove all currently marked correct answers so you can rescore from scratch."
				cancelLabel="Keep markings"
				actionLabel={isClearingMarkings ? "Clearing..." : "Clear markings"}
				actionVariant="destructive"
				actionDisabled={isClearingMarkings}
				onAction={onClearAnswerMarkings}
			/>

			<ConfirmDialog
				open={isLockConfirmOpen}
				onOpenChange={onLockConfirmChange}
				title="Lock predictions?"
				description="Players will no longer be able to join or submit predictions. Use this when the match starts."
				cancelLabel="Keep open"
				actionLabel={isLocking ? "Locking..." : "Lock predictions"}
				actionDisabled={isLocking}
				onAction={onLockPredictions}
			/>

			<ConfirmDialog
				open={isUnlockConfirmOpen}
				onOpenChange={onUnlockConfirmChange}
				title="Unlock predictions?"
				description="Players will be able to join and submit again. Only possible when no answers have been marked yet."
				cancelLabel="Keep locked"
				actionLabel={isUnlocking ? "Unlocking..." : "Unlock predictions"}
				actionDisabled={isUnlocking}
				onAction={onUnlockPredictions}
			/>

			<CancelChallengeDialog
				open={isCancelChallengeConfirmOpen}
				onOpenChange={onCancelChallengeConfirmChange}
				challengeTitle={challengeTitle}
				isCancelling={isCancellingChallenge}
				onCancel={onCancelChallenge}
			/>
		</>
	);
}

function CancelChallengeDialog({
	open,
	onOpenChange,
	challengeTitle,
	isCancelling,
	onCancel,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	challengeTitle: string;
	isCancelling: boolean;
	onCancel: () => void;
}) {
	const [confirmText, setConfirmText] = useState("");
	const isConfirmed = confirmText.trim().toLowerCase() === "cancel";

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) setConfirmText("");
				onOpenChange(nextOpen);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel this challenge?</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="grid gap-3">
							<p>
								This will permanently close{" "}
								<strong className="text-foreground">{challengeTitle}</strong>{" "}
								without announcing winners. Players will see the challenge as
								cancelled.
							</p>
							<p>
								Type <strong className="text-foreground">cancel</strong> below
								to confirm.
							</p>
							<Input
								value={confirmText}
								onChange={(e) => setConfirmText(e.target.value)}
								placeholder='Type "cancel" to confirm'
								autoComplete="off"
								spellCheck={false}
							/>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						className="w-full sm:w-auto"
						onClick={() => setConfirmText("")}
					>
						Keep challenge
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						className="w-full sm:w-auto"
						onClick={onCancel}
						disabled={!isConfirmed || isCancelling}
					>
						{isCancelling ? "Cancelling..." : "Cancel challenge"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	cancelLabel,
	actionLabel,
	actionVariant,
	actionDisabled,
	onAction,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	cancelLabel: string;
	actionLabel: string;
	actionVariant?: "default" | "destructive";
	actionDisabled?: boolean;
	onAction: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="w-full sm:w-auto">
						{cancelLabel}
					</AlertDialogCancel>
					<AlertDialogAction
						variant={actionVariant}
						className="w-full sm:w-auto"
						onClick={onAction}
						disabled={actionDisabled}
					>
						{actionLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
