/* eslint-disable react-refresh/only-export-components */
import { Button } from "@newsnext/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@newsnext/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newsnext/ui/components/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@newsnext/ui/components/tooltip"

function FixtureStage({ children }: React.PropsWithChildren) {
  return <main className="grid min-h-full place-items-center p-24">{children}</main>
}

function PopoverFixture() {
  return (
    <FixtureStage>
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline" />}>Source options</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Refresh schedule</PopoverTitle>
            <PopoverDescription>Control how often this source is checked.</PopoverDescription>
          </PopoverHeader>
          <Button size="sm">Refresh now</Button>
        </PopoverContent>
      </Popover>
    </FixtureStage>
  )
}

function DropdownMenuFixture() {
  return (
    <FixtureStage>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger render={<Button variant="outline" />}>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Source actions</DropdownMenuLabel>
            <DropdownMenuItem>Refresh now</DropdownMenuItem>
            <DropdownMenuItem>Move to board</DropdownMenuItem>
            <DropdownMenuCheckboxItem defaultChecked>Show unread count</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete source</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </FixtureStage>
  )
}

function SelectFixture() {
  return (
    <FixtureStage>
      <Select defaultOpen defaultValue="daily">
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="daily">Daily reading</SelectItem>
          <SelectItem value="research">Product research</SelectItem>
          <SelectItem value="archive" disabled>Archive</SelectItem>
        </SelectContent>
      </Select>
    </FixtureStage>
  )
}

function TooltipFixture() {
  return (
    <FixtureStage>
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger render={<Button variant="outline" />}>Hover or focus</TooltipTrigger>
          <TooltipContent>Refresh this source</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </FixtureStage>
  )
}

export default {
  "Popover": PopoverFixture,
  "Dropdown menu": DropdownMenuFixture,
  "Select": SelectFixture,
  "Tooltip": TooltipFixture,
}
