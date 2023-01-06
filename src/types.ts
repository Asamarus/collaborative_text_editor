export enum MessageType {
	Init = 'init',
	NewContent = 'new_content',
	NewSelections = 'new_selections',
	ClearSelection = 'clear_selection',
}

type Selection = {
	color: string;
	selections: {
		cursorPosition: {
			left: number;
			top: number;
		};
		selectionRects: {
			left: number;
			top: number;
			width: number;
			height: number;
		}[];
	};
};

export type Selections = Record<string, Selection>;
