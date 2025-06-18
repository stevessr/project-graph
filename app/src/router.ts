// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/info`
  | `/secret`
  | `/settings/ai/ApiConfigForm`
  | `/settings/ai/ApiConfigSection`
  | `/settings/ai/PromptManagementSection`
  | `/test`
  | `/ui_test`
  | `/user/login`
  | `/user/register`
  | `/welcome`

export type Params = {
  
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
