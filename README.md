# draft-js-commit-log-plugin

`draft-js-commit-log-plugin` is an exploration of granular change-tracking in DraftJS. The usual approach to saving `draft-js` document is to serialize and store the document as a whole on save, which limits you to whole-document updates instead of a model where you would apply changes in sequence on a "branch" like you would on `git`. The plugin implements a change-tracking layer in DraftJS so that in-editor actions that analyzes changes pushed to the DraftJS state and forms sequential commits from them. It also tags all editor blocks with a stable, unique identifier so that changes can be consistently attached to them through saves.

## Install

You can install the plugin package from this repository by cloning and packing it yourself. It is not yet released on `npm`.

Given that you have `draft-js-plugin-editor` set up, you can simply do the following:

```js
// What you should already have
import React, { useState } from 'react'
import { Editor } from 'draft-js-plugin-editor'
import { EditorState } from 'draft-js'

// What this package offers
import createCommitLogPlugin from 'draft-js-commit-log-plugin'

const commitLogPlugin = createCommitLogPlugin()

const App = () => {
    const [editorState, setEditorState] = useState(EditorState.createEmpty())
    return (
        <Editor
            editorState={editorState}
            plugins={[commitLogPlugin]}
            onChange={s => setEditorState(s)}
        />
    )
}
```
