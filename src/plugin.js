const { deriveChangesFromStates, tagUntaggedBlocks } = require('./utils')

const createCommitLogPlugin = () => {
    const pluginState = {
        commits: [],
        previousState: null,
        changeIndex: 0,
    }

    const initialize = () => {}

    const updatePluginState = ({ newCommits, previousState }) => {
        pluginState.commits = pluginState.commits.concat(newCommits)
        pluginState.previousState = previousState
        pluginState.changeIndex += 1
    }

    const getCommitLog = () => {
        return pluginState.commits
    }

    const onChange = editorState => {
        const prevState = pluginState.previousState
        const nextState = tagUntaggedBlocks(editorState)
        const newCommits = deriveChangesFromStates(prevState, nextState)
        updatePluginState({ newCommits, previousState: nextState })
        // TODO: remove when hardening
        // eslint-disable-next-line no-console
        console.table(pluginState.commits)
        return nextState
    }

    return {
        initialize,
        onChange,
        getCommitLog,
        pluginState,
    }
}

module.exports = createCommitLogPlugin
