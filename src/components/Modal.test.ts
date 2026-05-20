import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from '@/components/Modal.vue'

describe('Modal', () => {
  it('renders title', () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'TEST MODAL' },
      slots: { default: '<p>Content here</p>' },
    })

    expect(wrapper.text()).toContain('TEST MODAL')
  })

  it('renders slot content', () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'TITLE' },
      slots: { default: '<p>Slot content</p>' },
    })

    expect(wrapper.text()).toContain('Slot content')
  })

  it('emits close when X button is clicked', async () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'TITLE' },
      slots: { default: '<p>Content</p>' },
    })

    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('X'))!
    await closeBtn.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on dialog close event', async () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'TITLE' },
      slots: { default: '<p>Content</p>' },
    })

    const dialog = wrapper.find('dialog')
    await dialog.trigger('close')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
