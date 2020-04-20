const uuid = require('uuid/v4')
const { ContentState, EditorState } = require('draft-js')
const Immutable = require('immutable')

const { editorChangeTypes, commitTypes, TAG } = require('./constants')

function getBlockTag(block) {
    return block.getData().get(TAG)
}

function reconcileTags(previousBlockMap, currentBlockMap) {
    return previousBlockMap.valueSeq().map(block => {
        const isTagged = getBlockTag(block)

        if (isTagged) return block

        const key = block.getKey()
        const currentBlock = currentBlockMap.get(key)

        if (!currentBlock) return block

        const newBlockData = block.getData().set(TAG, getBlockTag(currentBlock))
        return isTagged ? block : block.set('data', newBlockData)
    })
}

function processBlockDeletion(previousBlocks, currentBlocks) {
    const deletedBlocks = previousBlocks
        .valueSeq()
        .filter(block => !currentBlocks.has(getBlockTag(block)))

    return deletedBlocks
        .map(block => ({
            type: commitTypes.DELETE,
            tag: getBlockTag(block),
        }))
        .toJS()
}

function processBlockCreation(previousBlocks, currentBlocks) {
    const addedBlocks = currentBlocks
        .valueSeq()
        .filter(block => !previousBlocks.has(getBlockTag(block)))

    return addedBlocks
        .map(block => ({
            type: commitTypes.ADD,
            tag: getBlockTag(block),
            text: block.getText(),
        }))
        .toJS()
}

function processBlockEdit(previousBlocks, currentBlocks) {
    const editedBlocks = currentBlocks.valueSeq().filter(block => {
        const currentTag = getBlockTag(block)
        const blockBefore = previousBlocks.get(currentTag)
        if (!currentTag || !blockBefore) return false

        const isTextDifferent = block.getText() !== blockBefore.getText()
        const isBlockCommon = !!blockBefore
        return isTextDifferent && isBlockCommon
    })

    return editedBlocks
        .map(block => ({
            type: commitTypes.EDIT,
            tag: getBlockTag(block),
            text: block.getText(),
        }))
        .toJS()
}

function deriveChangesFromStates(previous, actual) {
    const changeType = actual.getLastChangeType()
    const currentBlocks = getBlockMapByTag(
        actual.getCurrentContent().getBlockMap().valueSeq().toList(),
    )
    const previousBlocks = previous
        ? getBlockMapByTag(
              reconcileTags(
                  previous.getCurrentContent().getBlockMap(),
                  actual.getCurrentContent().getBlockMap(),
              ).toList(),
          )
        : new Immutable.Map()
    const hasLessBlocks = previousBlocks.size > currentBlocks.size
    if (
        changeType === editorChangeTypes.INSERT_CHARACTERS ||
        (changeType === editorChangeTypes.BACKSPACE_CHARACTER && !hasLessBlocks)
    ) {
        return processBlockEdit(previousBlocks, currentBlocks)
    } else if (changeType === editorChangeTypes.SPLIT_BLOCK) {
        return processBlockCreation(previousBlocks, currentBlocks)
    } else if (
        changeType === editorChangeTypes.BACKSPACE_CHARACTER &&
        hasLessBlocks
    ) {
        return processBlockDeletion(previousBlocks, currentBlocks)
    }

    // TODO: Clear up initial block creation.
    if (previousBlocks.size === 0)
        return processBlockCreation(previousBlocks, currentBlocks)

    return []
}

function tagUntaggedBlocks(editorState) {
    const contentState = editorState.getCurrentContent()
    const blockList = contentState.getBlockMap().valueSeq()

    const taggedBlockList = blockList.map(block => {
        const isTagged = getBlockTag(block)
        const newBlockData = block.getData().set(TAG, uuid())
        return isTagged ? block : block.set('data', newBlockData)
    })

    const updatedContent = ContentState.createFromBlockArray(
        taggedBlockList.toArray(),
        contentState.getEntityMap(),
    )
    return EditorState.set(editorState, { currentContent: updatedContent })
}

function getBlockMapByTag(blocks) {
    return blocks.reduce((blockTagMap, block) => {
        const tag = getBlockTag(block)
        if (!tag || !block) return blockTagMap
        return blockTagMap.set(tag, block)
    }, new Immutable.Map())
}

module.exports = {
    tagUntaggedBlocks,
    deriveChangesFromStates,
}
