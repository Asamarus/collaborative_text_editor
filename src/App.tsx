import React, { Fragment, useEffect, useRef, useState } from 'react';

import { Editor, EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import debounce from 'debounce';
import { MessageType, Selections } from './types';

const emptyState = EditorState.createEmpty();

function App() {
	const isMounted = useRef(false);
	const currentSelection = useRef(emptyState.getSelection());
	const ws = useRef(null);
	const editor = useRef(null);
	const userId = useRef(null);
	const containerNode = useRef(null);
	const [content, setEditorContent] = useState(
		convertToRaw(emptyState.getCurrentContent()),
	);
	const [userSelections, setUserSelections] = useState<Selections>({});

	useEffect(() => {
		isMounted.current = true;
		ws.current = new WebSocket('ws://localhost:3333');

		ws.current.onmessage = (event) => {
			handleMessage(JSON.parse(event.data));
		};

		const hasSelectionChange = 'onselectionchange' in document;
		const events = hasSelectionChange
			? 'selectionchange'
			: 'mousemove mouseup keypress keydown keyup';

		events.split(' ').forEach((e) => {
			document.addEventListener(e, onSelectionChange);
		});

		return () => {
			isMounted.current = false;
			ws.current.close();
			events.split(' ').forEach((e) => {
				document.removeEventListener(e, onSelectionChange);
			});
		};
	}, []);

	const handleMessage = (data) => {
		if (!isMounted.current) return;

		const { type, newEditorContent, selections } = data;
		if (type === MessageType.Init) {
			setEditorContent(newEditorContent);
			setUserSelections(selections);
			userId.current = data.userId;
		} else if (type === MessageType.NewContent) {
			setEditorContent(newEditorContent);
		} else if (type === MessageType.NewSelections) {
			setUserSelections(selections);
		}
	};

	const broadcast = debounce(({ type, value }) => {
		if (!ws.current) return;
		ws.current.send(
			JSON.stringify({
				type,
				...(type === MessageType.NewContent && { newEditorContent: value }),
				...(type === MessageType.NewSelections && { selections: value }),
			}),
		);
	}, 300);

	const onSelectionChange = () => {
		const selection = document.getSelection();
		if (selection.rangeCount === 0) {
			return;
		}
		const containerNodeRect = containerNode.current.getBoundingClientRect();
		const rects = selection.getRangeAt(0).getClientRects();
		const firstRect = rects[0];

		if (typeof firstRect === 'undefined') {
			return;
		}

		const cursorPosition = {
			left: firstRect.left - containerNodeRect.left,
			top: firstRect.top - containerNodeRect.top,
		};

		const selectionRects = Array.from(rects).map((rect) => ({
			left: rect.left - containerNodeRect.left,
			top: rect.top - containerNodeRect.top,
			width: Math.max(rect.width, 1),
			height: Math.max(rect.height, 1),
		}));

		broadcast({
			type: MessageType.NewSelections,
			value: { cursorPosition, selectionRects },
		});
	};

	return (
		<>
			<div
				ref={containerNode}
				className="content"
				onClick={() => {
					editor.current?.focus();
				}}
			>
				<Editor
					ref={editor}
					editorState={EditorState.acceptSelection(
						EditorState.createWithContent(convertFromRaw(content)),
						currentSelection.current,
					)}
					onChange={(editorState) => {
						const content = convertToRaw(editorState.getCurrentContent());
						currentSelection.current = editorState.getSelection();

						broadcast({ type: MessageType.NewContent, value: content });
						setEditorContent(content);
					}}
				/>
				{Object.keys(userSelections).map((selectionKey) => {
					const { color, selections } = userSelections[selectionKey];
					const { cursorPosition, selectionRects } = selections;

					if (selectionKey === userId.current) {
						return null;
					}
					return (
						<Fragment key={selectionKey}>
							<div
								className="cursor"
								style={{ backgroundColor: color, ...cursorPosition }}
							/>
							{selectionRects.map((rect, index) => {
								if (rect.width === 1) return null;
								return (
									<div
										key={index}
										className="selection"
										style={{ backgroundColor: color, ...rect }}
									/>
								);
							})}
						</Fragment>
					);
				})}
			</div>
		</>
	);
}

export default App;
