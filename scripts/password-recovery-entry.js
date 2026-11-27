import { createApp } from 'vue';
import { ElButton, ElInput } from 'element-plus';
import 'element-plus/theme-chalk/base.css';
import 'element-plus/theme-chalk/el-input.css';
import 'element-plus/theme-chalk/el-button.css';
import PasswordChangeForm from 'customer-password-form';

export function mountPasswordRecovery(container, onSuccess) {
  const app = createApp(PasswordChangeForm, { recovery: true, onSuccess });
  app.component('ElButton', ElButton).component('ElInput', ElInput);
  const form = app.mount(container);
  return { submit: () => form.submit(), dispose: () => app.unmount() };
}
