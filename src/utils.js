const uuid = require('uuid/v4')
const { ContentState, EditorState } = require('draft-js')
const Immutable = require('immutable')

function reconcileTags(previousBlockMap, currentBlockMap) {
    return previousBlockMap.valueSeq().map(block => {
        const isTagged = block.getData().has('tag')

        if (isTagged) return block

        const key = block.getKey()
        const currentBlock = currentBlockMap.get(key)

        if (!currentBlock) return block

        const newBlockData = block
            .getData()
            .set('tag', currentBlock.getData().get('tag'))
        return isTagged ? block : block.set('data', newBlockData)
    })
}

function processBlockDeletion(previousBlocks, currentBlocks) {
    const deletedBlocks = previousBlocks
        .valueSeq()
        .filter(block => !currentBlocks.has(block.getData().get('tag')))

    return deletedBlocks
        .map(block => ({
            type: 'delete',
            tag: block.getData().get('tag'),
        }))
        .toJS()
}

function processBlockCreation(previousBlocks, currentBlocks) {
    const addedBlocks = currentBlocks
        .valueSeq()
        .filter(block => !previousBlocks.has(block.getData().get('tag')))

    return addedBlocks
        .map(block => ({
            type: 'add',
            tag: block.getData().get('tag'),
            text: block.getText(),
        }))
        .toJS()
}

function processBlockEdit(previousBlocks, currentBlocks) {
    const editedBlocks = currentBlocks.valueSeq().filter(block => {
        const currentTag = block.getData().get('tag')
        const blockBefore = previousBlocks.get(currentTag)

        if (!currentTag || !blockBefore) return false

        const isTextDifferent = block.getText() !== blockBefore.getText()
        const isBlockCommon = !!blockBefore
        return isTextDifferent && isBlockCommon
    })

    return editedBlocks
        .map(block => ({
            type: 'edit',
            tag: block.getData().get('tag'),
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
        changeType === 'insert-characters' ||
        (changeType === 'backspace-character' && !hasLessBlocks)
    ) {
        return processBlockEdit(previousBlocks, currentBlocks)
    } else if (changeType === 'split-block') {
        return processBlockCreation(previousBlocks, currentBlocks)
    } else if (changeType === 'backspace-character' && hasLessBlocks) {
        return processBlockDeletion(previousBlocks, currentBlocks)
    }

    return []
}

function tagUntaggedBlocks(editorState) {
    const contentState = editorState.getCurrentContent()
    const blockList = contentState.getBlockMap().valueSeq()

    const taggedBlockList = blockList.map(block => {
        const isTagged = block.getData().has('tag')
        const newBlockData = block.getData().set('tag', uuid())
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
        const tag = block.getData().get('tag')
        if (!tag || !block) return blockTagMap
        return blockTagMap.set(tag, block)
    }, new Immutable.Map())
}

module.exports = {
    tagUntaggedBlocks,
    deriveChangesFromStates,
}
