import { defineHandler } from "nitro"
import { getApiHealth } from "@/health"

export default defineHandler(() => getApiHealth())
