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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@newsnext/ui/components/tooltip"
import { FixturePage, FixtureSection } from "@/cosmos/fixture-layout"

function OverlayFixturePage({ children, description, title }: React.PropsWithChildren<{ description: string, title: string }>): React.JSX.Element {
  return (
    <FixturePage category="Basics" title={title} description={description} width="md">
      <FixtureSection title="Open state" description="The fixture opens by default so placement, surface, and focus treatment remain visible.">
        <div className="grid min-h-72 place-items-center">{children}</div>
      </FixtureSection>
    </FixturePage>
  )
}

function PopoverFixture() {
  return (
    <OverlayFixturePage title="Popover" description="A compact contextual surface anchored to a visible trigger.">
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
    </OverlayFixturePage>
  )
}

function DropdownMenuFixture() {
  return (
    <OverlayFixturePage title="Dropdown menu" description="Action and selection rows grouped around one trigger.">
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
    </OverlayFixturePage>
  )
}

function TooltipFixture() {
  return (
    <OverlayFixturePage title="Tooltip" description="Short supplemental text revealed from hover or keyboard focus.">
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger render={<Button variant="outline" />}>Hover or focus</TooltipTrigger>
          <TooltipContent>Refresh this source</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </OverlayFixturePage>
  )
}

export default {
  "Popover": PopoverFixture,
  "Dropdown menu": DropdownMenuFixture,
  "Tooltip": TooltipFixture,
}
