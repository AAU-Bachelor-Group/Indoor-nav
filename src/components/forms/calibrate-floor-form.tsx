import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { editFloorPlanData } from "#/server/floorplan.functions"

interface Props {
  floor: number
  pixelDistance: number
  position: { x: number; y: number }
  onReset: () => void
}

export const CalibrateFloorForm = ({ floor, pixelDistance, position, onReset }: Props) => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (calibrationScale: number) =>
      editFloorPlanData({ data: { floor, calibrationScale } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["floorPlans"] }),
  })

  const form = useForm({
    defaultValues: { realDistance: "" },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(Number(value.realDistance) / pixelDistance)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(5%, -120%)",
        zIndex: 10,
      }}
    >
      <Card className="w-[220px] p-2 pb-5">
        <CardHeader>
          <CardTitle>Calibration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm">Pixel distance: {pixelDistance.toFixed(2)}</p>

          <form.Field
            name="realDistance"
            validators={{
              onChange: ({ value }) => {
                const result = z.number().positive().safeParse(Number(value))
                return !value || !result.success ? "Enter a positive distance in meters" : undefined
              },
            }}
          >
            {(field) => {
              const n = Number(field.state.value)
              const hasError = field.state.meta.errors.length > 0 || mutation.isError
              return (
                <>
                  <Input
                    aria-invalid={hasError}
                    placeholder="Distance in meters"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                      mutation.reset()
                    }}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">{field.state.meta.errors[0]}</p>
                  )}
                  {mutation.isError && (
                    <p className="text-destructive text-xs">
                      {mutation.error instanceof Error
                        ? mutation.error.message
                        : "Failed to save calibration"}
                    </p>
                  )}
                  {n > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Scale: {(n / pixelDistance).toFixed(5)} m/px
                    </p>
                  )}
                </>
              )
            }}
          </form.Field>

          {mutation.isSuccess && <p className="text-green-600 text-sm">Calibration saved!</p>}

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Calibration"}
              </Button>
            )}
          </form.Subscribe>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onReset()
            }}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
