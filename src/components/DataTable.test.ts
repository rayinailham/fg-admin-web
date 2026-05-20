import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '@/components/DataTable.vue'

const columns = [
  { key: 'name', label: 'NAME' },
  { key: 'email', label: 'EMAIL' },
  { key: 'status', label: 'STATUS', format: (v: unknown) => v ? 'ACTIVE' : 'INACTIVE' },
]

const rows = [
  { name: 'John Doe', email: 'john@test.com', status: true },
  { name: 'Jane Smith', email: 'jane@test.com', status: false },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [] },
    })

    expect(wrapper.text()).toContain('NAME')
    expect(wrapper.text()).toContain('EMAIL')
    expect(wrapper.text()).toContain('STATUS')
  })

  it('renders rows with data', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows },
    })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@test.com')
    expect(wrapper.text()).toContain('Jane Smith')
  })

  it('applies format function to cell values', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows },
    })

    expect(wrapper.text()).toContain('ACTIVE')
    expect(wrapper.text()).toContain('INACTIVE')
  })

  it('displays em dash for null/undefined values', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: [{ key: 'name', label: 'NAME' }],
        rows: [{ name: null }],
      },
    })

    expect(wrapper.text()).toContain('\u2014')
  })

  it('shows empty state when no rows', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [] },
    })

    expect(wrapper.text()).toContain('[ NO RECORDS FOUND ]')
  })

  it('shows custom empty text', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [], emptyText: '[ NO USERS ]' },
    })

    expect(wrapper.text()).toContain('[ NO USERS ]')
  })

  it('shows loading state', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows: [], loading: true },
    })

    expect(wrapper.text()).toContain('LOADING')
  })

  it('renders pagination buttons when hasNext or hasPrev', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: true, hasPrev: false },
    })

    expect(wrapper.text()).toContain('NEXT')
    expect(wrapper.text()).toContain('PREV')
  })

  it('does not render pagination when no next/prev', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: false, hasPrev: false },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emits next event on next button click', async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: true, hasPrev: false },
    })

    const buttons = wrapper.findAll('button')
    const nextBtn = buttons.find((b) => b.text().includes('NEXT'))!
    await nextBtn.trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('emits prev event on prev button click', async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: false, hasPrev: true },
    })

    const buttons = wrapper.findAll('button')
    const prevBtn = buttons.find((b) => b.text().includes('PREV'))!
    await prevBtn.trigger('click')

    expect(wrapper.emitted('prev')).toHaveLength(1)
  })

  it('emits row-click when a row is clicked', async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, clickable: true },
    })

    const tableRows = wrapper.findAll('tbody tr')
    await tableRows[0]!.trigger('click')

    expect(wrapper.emitted('row-click')).toHaveLength(1)
    expect(wrapper.emitted('row-click')![0]).toEqual([rows[0]])
  })

  it('does not emit row-click when clickable is false', async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, clickable: false },
    })

    const tableRows = wrapper.findAll('tbody tr')
    await tableRows[0]!.trigger('click')

    expect(wrapper.emitted('row-click')).toBeUndefined()
  })

  it('disables prev button when hasPrev is false', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: true, hasPrev: false },
    })

    const buttons = wrapper.findAll('button')
    const prevBtn = buttons.find((b) => b.text().includes('PREV'))!
    expect(prevBtn.attributes('disabled')).toBeDefined()
  })

  it('disables next button when hasNext is false', () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, hasNext: false, hasPrev: true },
    })

    const buttons = wrapper.findAll('button')
    const nextBtn = buttons.find((b) => b.text().includes('NEXT'))!
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })
})
