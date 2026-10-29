import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export const SearchAndReplacePluginKey = new PluginKey<SearchAndReplaceState>("searchAndReplace");

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchAndReplaceState {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  isOpen: boolean;
  isReplaceOpen: boolean;
  results: SearchMatch[];
  currentIndex: number;
  decorations: DecorationSet;
}

export interface SearchAndReplaceOptions {
  onStateChange?: ((state: SearchAndReplaceState) => void) | undefined;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      openSearch: (isReplace?: boolean) => ReturnType;
      closeSearch: () => ReturnType;
      setSearchTerm: (searchTerm: string) => ReturnType;
      setReplaceTerm: (replaceTerm: string) => ReturnType;
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      goToNextMatch: () => ReturnType;
      goToPrevMatch: () => ReturnType;
      replaceCurrentMatch: () => ReturnType;
      replaceAllMatches: () => ReturnType;
    };
  }
}

function findMatches(
  doc: PMNode,
  searchTerm: string,
  caseSensitive: boolean
): SearchMatch[] {
  if (!searchTerm || searchTerm.length === 0) {
    return [];
  }

  const matches: SearchMatch[] = [];
  const termToFind = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = caseSensitive ? node.text : node.text.toLowerCase();
      let index = text.indexOf(termToFind);

      while (index !== -1) {
        matches.push({
          from: pos + index,
          to: pos + index + searchTerm.length,
        });
        index = text.indexOf(termToFind, index + searchTerm.length);
      }
    }
    return true;
  });

  return matches;
}

function buildDecorations(
  doc: PMNode,
  results: SearchMatch[],
  currentIndex: number
): DecorationSet {
  if (results.length === 0) {
    return DecorationSet.empty;
  }

  const decos = results.map((match, idx) => {
    const isCurrent = idx === currentIndex;
    return Decoration.inline(match.from, match.to, {
      class: isCurrent
        ? "local-search-match active-match"
        : "local-search-match",
    });
  });

  return DecorationSet.create(doc, decos);
}

export const SearchAndReplace = Extension.create<SearchAndReplaceOptions>({
  name: "searchAndReplace",

  addOptions() {
    return {
      onStateChange: undefined,
    };
  },

  addCommands() {
    return {
      openSearch:
        (isReplace = false) =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            // If user has highlighted text in editor, populate as initial search term
            const { from, to } = editor.state.selection;
            let initialTerm = "";
            if (from < to) {
              const selectedText = editor.state.doc.textBetween(from, to, " ");
              if (selectedText.length > 0 && selectedText.length <= 100) {
                initialTerm = selectedText;
              }
            }

            const current = SearchAndReplacePluginKey.getState(editor.state);
            const term = initialTerm || current?.searchTerm || "";
            const caseSensitive = current?.caseSensitive || false;
            const matches = findMatches(editor.state.doc, term, caseSensitive);
            const currentIndex = matches.length > 0 ? 0 : -1;
            const decorations = buildDecorations(editor.state.doc, matches, currentIndex);

            const nextState: SearchAndReplaceState = {
              searchTerm: term,
              replaceTerm: current?.replaceTerm || "",
              caseSensitive,
              isOpen: true,
              isReplaceOpen: isReplace || (current ? current.isReplaceOpen : false),
              results: matches,
              currentIndex,
              decorations,
            };

            tr.setMeta(SearchAndReplacePluginKey, nextState);
            dispatch(tr);
            this.options.onStateChange?.(nextState);

            if (currentIndex >= 0 && matches[currentIndex]) {
              editor.commands.scrollIntoView();
            }
          }
          return true;
        },

      closeSearch:
        () =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            const nextState: SearchAndReplaceState = {
              searchTerm: "",
              replaceTerm: "",
              caseSensitive: false,
              isOpen: false,
              isReplaceOpen: false,
              results: [],
              currentIndex: -1,
              decorations: DecorationSet.empty,
            };
            tr.setMeta(SearchAndReplacePluginKey, nextState);
            dispatch(tr);
            this.options.onStateChange?.(nextState);
            editor.commands.focus();
          }
          return true;
        },

      setSearchTerm:
        (searchTerm: string) =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            const current = SearchAndReplacePluginKey.getState(editor.state);
            const caseSensitive = current?.caseSensitive || false;
            const matches = findMatches(editor.state.doc, searchTerm, caseSensitive);
            const currentIndex = matches.length > 0 ? 0 : -1;
            const decorations = buildDecorations(editor.state.doc, matches, currentIndex);

            const nextState: SearchAndReplaceState = {
              searchTerm,
              replaceTerm: current?.replaceTerm || "",
              caseSensitive,
              isOpen: true,
              isReplaceOpen: current?.isReplaceOpen || false,
              results: matches,
              currentIndex,
              decorations,
            };

            tr.setMeta(SearchAndReplacePluginKey, nextState);
            dispatch(tr);
            this.options.onStateChange?.(nextState);

            if (currentIndex >= 0 && matches[currentIndex]) {
              editor.commands.scrollIntoView();
            }
          }
          return true;
        },

      setReplaceTerm:
        (replaceTerm: string) =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            const current = SearchAndReplacePluginKey.getState(editor.state);
            if (current) {
              const nextState: SearchAndReplaceState = {
                ...current,
                replaceTerm,
              };
              tr.setMeta(SearchAndReplacePluginKey, nextState);
              dispatch(tr);
              this.options.onStateChange?.(nextState);
            }
          }
          return true;
        },

      setCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            const current = SearchAndReplacePluginKey.getState(editor.state);
            if (current) {
              const matches = findMatches(editor.state.doc, current.searchTerm, caseSensitive);
              const currentIndex = matches.length > 0 ? 0 : -1;
              const decorations = buildDecorations(editor.state.doc, matches, currentIndex);

              const nextState: SearchAndReplaceState = {
                ...current,
                caseSensitive,
                results: matches,
                currentIndex,
                decorations,
              };
              tr.setMeta(SearchAndReplacePluginKey, nextState);
              dispatch(tr);
              this.options.onStateChange?.(nextState);
            }
          }
          return true;
        },

      goToNextMatch:
        () =>
        ({ editor, tr, dispatch }) => {
          const current = SearchAndReplacePluginKey.getState(editor.state);
          if (current && current.results.length > 0) {
            const nextIndex = (current.currentIndex + 1) % current.results.length;
            const decorations = buildDecorations(editor.state.doc, current.results, nextIndex);

            const nextState: SearchAndReplaceState = {
              ...current,
              currentIndex: nextIndex,
              decorations,
            };

            if (dispatch) {
              tr.setMeta(SearchAndReplacePluginKey, nextState);
              dispatch(tr);
              this.options.onStateChange?.(nextState);
            }

            const target = current.results[nextIndex];
            if (target) {
              editor.commands.setTextSelection({ from: target.from, to: target.to });
              editor.commands.scrollIntoView();
            }
            return true;
          }
          return false;
        },

      goToPrevMatch:
        () =>
        ({ editor, tr, dispatch }) => {
          const current = SearchAndReplacePluginKey.getState(editor.state);
          if (current && current.results.length > 0) {
            const prevIndex =
              (current.currentIndex - 1 + current.results.length) % current.results.length;
            const decorations = buildDecorations(editor.state.doc, current.results, prevIndex);

            const nextState: SearchAndReplaceState = {
              ...current,
              currentIndex: prevIndex,
              decorations,
            };

            if (dispatch) {
              tr.setMeta(SearchAndReplacePluginKey, nextState);
              dispatch(tr);
              this.options.onStateChange?.(nextState);
            }

            const target = current.results[prevIndex];
            if (target) {
              editor.commands.setTextSelection({ from: target.from, to: target.to });
              editor.commands.scrollIntoView();
            }
            return true;
          }
          return false;
        },

      replaceCurrentMatch:
        () =>
        ({ editor, tr, dispatch }) => {
          const current = SearchAndReplacePluginKey.getState(editor.state);
          if (
            current &&
            current.results.length > 0 &&
            current.currentIndex >= 0 &&
            current.currentIndex < current.results.length
          ) {
            const match = current.results[current.currentIndex];
            if (match && dispatch) {
              tr.insertText(current.replaceTerm, match.from, match.to);

              // Recalculate matches on new doc
              const newMatches = findMatches(tr.doc, current.searchTerm, current.caseSensitive);
              const nextIndex = newMatches.length > 0
                ? Math.min(current.currentIndex, newMatches.length - 1)
                : -1;
              const decorations = buildDecorations(tr.doc, newMatches, nextIndex);

              const nextState: SearchAndReplaceState = {
                ...current,
                results: newMatches,
                currentIndex: nextIndex,
                decorations,
              };

              tr.setMeta(SearchAndReplacePluginKey, nextState);
              dispatch(tr);
              this.options.onStateChange?.(nextState);

              if (nextIndex >= 0 && newMatches[nextIndex]) {
                const target = newMatches[nextIndex];
                editor.commands.setTextSelection({ from: target.from, to: target.to });
                editor.commands.scrollIntoView();
              }
              return true;
            }
          }
          return false;
        },

      replaceAllMatches:
        () =>
        ({ editor, tr, dispatch }) => {
          const current = SearchAndReplacePluginKey.getState(editor.state);
          if (current && current.results.length > 0 && dispatch) {
            // Replace in reverse to avoid shifting positions
            for (let i = current.results.length - 1; i >= 0; i--) {
              const match = current.results[i];
              if (match) {
                tr.insertText(current.replaceTerm, match.from, match.to);
              }
            }

            const nextState: SearchAndReplaceState = {
              ...current,
              results: [],
              currentIndex: -1,
              decorations: DecorationSet.empty,
            };

            tr.setMeta(SearchAndReplacePluginKey, nextState);
            dispatch(tr);
            this.options.onStateChange?.(nextState);
            return true;
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-f": () => {
        return this.editor.commands.openSearch(false);
      },
      "Mod-r": () => {
        return this.editor.commands.openSearch(true);
      },
      Escape: () => {
        const state = SearchAndReplacePluginKey.getState(this.editor.state);
        if (state?.isOpen) {
          return this.editor.commands.closeSearch();
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchAndReplaceState>({
        key: SearchAndReplacePluginKey,
        state: {
          init: () => ({
            searchTerm: "",
            replaceTerm: "",
            caseSensitive: false,
            isOpen: false,
            isReplaceOpen: false,
            results: [],
            currentIndex: -1,
            decorations: DecorationSet.empty,
          }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(SearchAndReplacePluginKey) as
              | SearchAndReplaceState
              | undefined;

            if (meta) {
              return meta;
            }

            // If the document changed and search is open, recalculate matches
            if (tr.docChanged && prev.isOpen && prev.searchTerm) {
              const matches = findMatches(tr.doc, prev.searchTerm, prev.caseSensitive);
              const nextIndex =
                matches.length > 0
                  ? Math.min(Math.max(0, prev.currentIndex), matches.length - 1)
                  : -1;
              const decorations = buildDecorations(tr.doc, matches, nextIndex);
              const updatedState: SearchAndReplaceState = {
                ...prev,
                results: matches,
                currentIndex: nextIndex,
                decorations,
              };
              this.options.onStateChange?.(updatedState);
              return updatedState;
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return SearchAndReplacePluginKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
