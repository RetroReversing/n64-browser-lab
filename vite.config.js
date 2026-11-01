import {defineConfig} from 'vite';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
export default defineConfig({plugins:[nodePolyfills({include:['buffer','events','path','stream','util','process'],globals:{Buffer:true,global:true,process:true}})],worker:{plugins:()=>[nodePolyfills({include:['buffer','events','path','stream','util','process'],globals:{Buffer:true,global:true,process:true}})]}});
