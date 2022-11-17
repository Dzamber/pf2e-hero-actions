import { createCustomActionsTable, createDefautActionsTable, getDefaultWorldTable, getTableSource } from './hero-actions.js'
import { info, setFlag, setSetting, subLocalize, templatePath, warn } from './utils/foundry.js'

export const CREATE_TABLE_UUID = 'Compendium.pf2e-hero-actions.macros.SUXi4nhdJb8vZk58'

const localizeChoice = subLocalize('templates.createTable.choice')
const localizeDefaultConfirm = subLocalize('templates.createTable.default.confirm')
const localizeRemove = subLocalize('templates.removeActions')

export async function removeHeroActions() {
    const template = templatePath('dialogs/remove-actions.html')

    /** @type {Record<string, DialogButton>} */
    const buttons = {
        yes: {
            label: localizeRemove('remove'),
            icon: '<i class="fas fa-trash"></i>',
            callback: $html =>
                $html
                    .find('input[name="actor"]:checked')
                    .toArray()
                    .map(x => game.actors.get(/** @type {HTMLInputElement} */ (x).value))
                    .filter(x => x),
        },
        no: {
            label: localizeRemove('cancel'),
            icon: '<i class="fas fa-times"></i>',
            callback: () => [],
        },
    }

    /** @type {DialogData} */
    const data = {
        content: await renderTemplate(template, { actors: game.actors.filter(x => x.type === 'character') }),
        title: localizeRemove('title'),
        buttons,
        default: 'yes',
        render: $html => {
            $html.on('change', 'input[name="all"]', () => removeActionsToggleAll($html))
            $html.on('change', 'input[name="actor"]', () => removeActionsToggleActor($html))
        },
        close: () => [],
    }

    const actors = await Dialog.wait(data, undefined, { id: 'pf2e-hero-actions-remove-actions' })
    if (!actors.length) {
        return warn('templates.removeActions.noSelection')
    }

    for (const actor of actors) {
        await setFlag(actor, 'heroActions', [])
    }

    info('templates.removeActions.removed')
}

/** @param {JQuery} $html */
function removeActionsToggleAll($html) {
    const state = /** @type {HTMLInputElement} */ ($html.find('input[name="all"]')[0]).checked
    $html.find('input[name="actor"]').prop('checked', state)
}

/** @param {JQuery} $html */
function removeActionsToggleActor($html) {
    const actors = $html.find('input[name="actor"]')
    const checked = actors.filter(':checked')
    const all = $html.find('input[name="all"]')

    if (actors.length === checked.length) {
        all.prop('checked', true).prop('indeterminate', false)
        actors.prop('checked', true)
    } else if (!checked.length) {
        all.prop('checked', false).prop('indeterminate', false)
        actors.prop('checked', false)
    } else {
        all.prop('checked', false).prop('indeterminate', true)
    }
}

export async function createTable() {
    const template = templatePath('dialogs/create-table.html')

    /** @type {Record<string, DialogButton>} */
    const buttons = {
        yes: {
            label: localizeChoice('create'),
            icon: '<i class="fas fa-border-all"></i>',
            callback: $html => {
                const type = $html.find('.window-content input[name="type"]:checked').val()
                const unique = $html.find('.window-content input[name="draw"]:checked').val() === 'unique'
                return { type, unique }
            },
        },
        no: {
            label: localizeChoice('cancel'),
            icon: '<i class="fas fa-times"></i>',
            callback: () => null,
        },
    }

    /** @type {DialogData} */
    const data = {
        content: await renderTemplate(template),
        title: localizeChoice('title'),
        buttons,
        default: 'yes',
        close: () => null,
    }

    const result = await Dialog.wait(data, undefined, { id: 'pf2e-hero-actions-create-table' })
    if (!result) return

    if (result.type === 'default') createDefaultTable(result.unique)
    else createCustomTable(result.unique)
}

/** @param {boolean} unique */
async function createDefaultTable(unique) {
    let table = await getDefaultWorldTable()

    if (table) {
        const override = await Dialog.confirm({
            title: localizeDefaultConfirm('title'),
            content: localizeDefaultConfirm('content'),
        })

        if (override) {
            const update = getTableSource(unique)
            await table.update(update)
            return setTable(table, true)
        }
    }

    table = await createDefautActionsTable(unique)
    await setTable(table)
}

/** @param {boolean} unique */
async function createCustomTable(unique) {
    const table = await createCustomActionsTable(unique)
    await setTable(table)
    table.sheet?.render(true)
}

/** @param {RollTable} table */
async function setTable(table, normalize = false) {
    if (normalize) await table.normalize()
    await setSetting('tableUUID', table.uuid)
}
