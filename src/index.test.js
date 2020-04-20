const uuid = require('uuid/v4')
const { EditorState, Modifier, ContentState } = require('draft-js')

jest.mock('uuid/v4')

const createCommitLogPlugin = require('.')

describe('', () => {
    let state
    let pluginInstance
    let c = 0

    beforeEach(() => {
        state = EditorState.createEmpty()
        pluginInstance = createCommitLogPlugin()

        jest.restoreAllMocks()
        uuid.mockImplementation(() => ++c)
    })

    describe('Creating blocks', () => {
        it('pushes an add for the initial block', () => {
            pluginInstance.onChange(state)
            const commitLog = pluginInstance.getCommitLog()
            expect(commitLog).toHaveLength(1)
            expect(commitLog[0].type).toEqual('add')
        })

        it('via split-block', () => {
            const initialContent = state.getCurrentContent()
            const withSplit = Modifier.splitBlock(
                initialContent,
                state.getSelection(),
            )
            const newState = EditorState.push(state, withSplit, 'split-block')
            pluginInstance.onChange(newState)

            const commitLog = pluginInstance.getCommitLog()
            expect(commitLog).toHaveLength(2)
            expect(commitLog[1].type).toEqual('add')
        })
    })

    describe('Editing blocks', () => {
        it('via insert-character', () => {
            const initialContent = state.getCurrentContent()
            const withSplit = Modifier.insertText(
                initialContent,
                state.getSelection(),
                '',
            )
            const newState = EditorState.push(state, withSplit, 'split-block')
            const newStateProcessed = pluginInstance.onChange(newState)
            const withText = Modifier.replaceText(
                newStateProcessed.getCurrentContent(),
                newStateProcessed.getSelection(),
                'yeet',
            )
            const newState2 = EditorState.push(
                newStateProcessed,
                withText,
                'insert-characters',
            )
            pluginInstance.onChange(newState2)

            const commitLog = pluginInstance.getCommitLog()
            expect(commitLog).toHaveLength(2)
            expect(commitLog[1].type).toEqual('edit')
            expect(commitLog[1].text).toEqual('yeet')
        })

        // it('via backspace-character', () => {})
    })

    describe('Deleting blocks', () => {
        it('via backspace-character', () => {
            const initialContent = state.getCurrentContent()
            const withSplit = Modifier.insertText(
                initialContent,
                state.getSelection(),
                '',
            )
            const newState = EditorState.push(state, withSplit, 'split-block')
            const newStateProcessed = pluginInstance.onChange(newState)
            const withoutBlock = ContentState.createFromBlockArray([])
            const newState2 = EditorState.push(
                newStateProcessed,
                withoutBlock,
                'backspace-character',
            )
            pluginInstance.onChange(newState2)

            const commitLog = pluginInstance.getCommitLog()
            expect(commitLog).toHaveLength(2)
            expect(commitLog[1].type).toEqual('delete')
            expect(commitLog[0].tag).toEqual(commitLog[1].tag)
        })
    })

    it('unrecognized changes do not produce commits', () => {
        pluginInstance.onChange(state)
        const initialContent = state.getCurrentContent()
        const withSplit = Modifier.insertText(
            initialContent,
            state.getSelection(),
            '',
        )
        const newState = EditorState.push(state, withSplit, 'yeet-block')
        pluginInstance.onChange(newState)
        // The only change is the initial add from onChange
        expect(pluginInstance.getCommitLog()).toHaveLength(1)
    })

    it('initialize sets up the state', () => {
        pluginInstance.initialize()
        expect(pluginInstance.pluginState).toEqual({
            changeIndex: 0,
            commits: [],
            previousState: null,
        })
    })
})
