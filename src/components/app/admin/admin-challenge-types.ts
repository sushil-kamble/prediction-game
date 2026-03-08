export type AdminQuestion = {
	_id: string;
	text: string;
	options: string[];
	pointValue: number;
	correctOptionIndex: number | null;
	order: number;
};
