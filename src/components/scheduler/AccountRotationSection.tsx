import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { InfoIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface AccountRotationSectionProps {
  form: UseFormReturn<any>;
  accounts: Array<{
    id: string;
    email: string;
    channelTitle?: string;
    status: string;
  }>;
}

export function AccountRotationSection({ form, accounts }: AccountRotationSectionProps) {
  const rotationEnabled = form.watch('enableAccountRotation');
  const principalAccounts = form.watch('principalAccounts') || [];
  const secondaryAccounts = form.watch('secondaryAccounts') || [];

  const activeAccounts = accounts.filter(a => a.status === 'active');

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
      <FormField
        control={form.control}
        name="enableAccountRotation"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Account Rotation</FormLabel>
              <FormDescription>
                Automatically alternate between principal and secondary accounts during sleep cycles
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {rotationEnabled && (
        <>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              During each sleep cycle, a subset of principal accounts will be temporarily
              replaced by secondary accounts. After sleep ends, they'll swap back with
              different random principal accounts. This helps avoid detection patterns.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Principal Accounts */}
            <FormField
              control={form.control}
              name="principalAccounts"
              render={() => (
                <FormItem>
                  <div className="mb-3">
                    <FormLabel>Principal Accounts</FormLabel>
                    <FormDescription className="text-xs">
                      Main accounts used most of the time
                    </FormDescription>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {activeAccounts.length > 1 && (
                      <div className="flex flex-row items-start space-x-3 space-y-0 pb-2 border-b mb-2">
                        <Checkbox
                          id="select-all-principal"
                          checked={
                            activeAccounts.length > 0 &&
                            activeAccounts.every(a => principalAccounts.includes(a.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue('principalAccounts', activeAccounts.map(a => a.id));
                            } else {
                              form.setValue('principalAccounts', []);
                            }
                          }}
                        />
                        <label
                          htmlFor="select-all-principal"
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Select All
                        </label>
                      </div>
                    )}
                    {activeAccounts.map((account) => (
                      <FormField
                        key={`principal-${account.id}`}
                        control={form.control}
                        name="principalAccounts"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(account.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, account.id])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value: string) => value !== account.id
                                        )
                                      );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {account.channelTitle || account.email}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Secondary Accounts */}
            <FormField
              control={form.control}
              name="secondaryAccounts"
              render={() => (
                <FormItem>
                  <div className="mb-3">
                    <FormLabel>Secondary Accounts</FormLabel>
                    <FormDescription className="text-xs">
                      Backup accounts for rotation (need ≥30% of principal count)
                    </FormDescription>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {activeAccounts.length > 1 && (
                      <div className="flex flex-row items-start space-x-3 space-y-0 pb-2 border-b mb-2">
                        <Checkbox
                          id="select-all-secondary"
                          checked={
                            activeAccounts.length > 0 &&
                            activeAccounts.every(a => secondaryAccounts.includes(a.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue('secondaryAccounts', activeAccounts.map(a => a.id));
                            } else {
                              form.setValue('secondaryAccounts', []);
                            }
                          }}
                        />
                        <label
                          htmlFor="select-all-secondary"
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Select All
                        </label>
                      </div>
                    )}
                    {activeAccounts.map((account) => (
                      <FormField
                        key={`secondary-${account.id}`}
                        control={form.control}
                        name="secondaryAccounts"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(account.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, account.id])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value: string) => value !== account.id
                                        )
                                      );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {account.channelTitle || account.email}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Validation Message */}
          {principalAccounts.length > 0 && secondaryAccounts.length > 0 && (
            <div className="text-sm">
              {secondaryAccounts.length >= Math.ceil(principalAccounts.length * 0.3) ? (
                <p className="text-green-600">
                  ✓ Valid configuration: {principalAccounts.length} principal, {secondaryAccounts.length} secondary accounts
                </p>
              ) : (
                <p className="text-destructive">
                  ⚠ Need at least {Math.ceil(principalAccounts.length * 0.3)} secondary accounts
                  (30% of {principalAccounts.length} principal accounts)
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
