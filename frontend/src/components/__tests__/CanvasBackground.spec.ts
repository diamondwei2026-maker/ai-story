import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';

describe('CanvasBackground', () => {
  let rafCallback: FrameRequestCallback | null = null;

  const mockRAF = vi.fn((cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', mockRAF);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rafCallback = null;
  });

  const mountCanvas = async (props: { particleCount?: number } = {}) => {
    const { default: CanvasBackground } = await import('@/components/CanvasBackground.vue');
    return mount(CanvasBackground, { props });
  };

  it('renders a <canvas> element', async () => {
    const wrapper = await mountCanvas();

    const canvas = wrapper.find('canvas');
    expect(canvas.exists()).toBe(true);
  });

  it('positions the canvas as fixed background behind all content', async () => {
    const wrapper = await mountCanvas();

    const canvas = wrapper.find('canvas');
    expect(canvas.attributes('style')).toContain('position');
  });

  it('starts the animation loop on mount by calling requestAnimationFrame', async () => {
    await mountCanvas();

    expect(mockRAF).toHaveBeenCalled();
  });

  it('cancels animation frame on unmount', async () => {
    const cancelMock = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelMock);

    const wrapper = await mountCanvas();
    wrapper.unmount();

    expect(cancelMock).toHaveBeenCalled();
  });

  it('accepts a particleCount prop with a default value', async () => {
    const wrapper = await mountCanvas({ particleCount: 80 });

    expect(wrapper.props('particleCount')).toBe(80);
  });

  it('has a default particleCount of 50', async () => {
    const wrapper = await mountCanvas();

    expect(wrapper.props('particleCount')).toBe(50);
  });
});
