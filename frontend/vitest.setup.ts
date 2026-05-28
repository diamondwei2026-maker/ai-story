import { config } from '@vue/test-utils';
import Antd from 'ant-design-vue';

config.global.plugins = [...(config.global.plugins || []), Antd];
