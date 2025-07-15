// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/info`
  | `/secret`
<<<<<<< HEAD
=======
  | `/settings`
  | `/settings/about`
  | `/settings/ai`
  | `/settings/ai/ApiConfigForm`
  | `/settings/ai/ApiConfigSection`
  | `/settings/ai/PromptManagementSection`
  | `/settings/automation`
  | `/settings/control`
  | `/settings/effects`
  | `/settings/github`
  | `/settings/keybinds`
  | `/settings/performance`
  | `/settings/physical`
  | `/settings/plugins`
  | `/settings/scripts`
  | `/settings/sounds`
  | `/settings/themes`
  | `/settings/visual`
>>>>>>> origin/lazy
  | `/test`
  | `/ui_test`
  | `/welcome`

export type Params = {
  
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
