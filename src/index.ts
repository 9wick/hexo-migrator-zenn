/* global hexo */
'use strict';
import {migrator} from "./lib/migrator";

// @ts-ignore
const h: Hexo = hexo;

h.extend.migrator.register('zenn', migrator);