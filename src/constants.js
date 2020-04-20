const editorChangeTypes = {
    INSERT_CHARACTERS: 'insert-characters',
    BACKSPACE_CHARACTER: 'backspace-character',
    SPLIT_BLOCK: 'split-block',
}

const commitTypes = {
    ADD: 'add',
    DELETE: 'delete',
    EDIT: 'edit',
}

const TAG = 'tag'

module.exports = {
    editorChangeTypes,
    commitTypes,
    TAG,
}
