import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import {
  paymentService,
  CreateCostShareRequest,
  CostType,
  GetCostSharingSuggestionRequest,
  CostSharingSuggestion,
} from "../../services/paymentService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import { aiService, CostSharingSuggestionResponse as AICostSharingSuggestion } from "../../services/aiService";

interface CreateCostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COST_TYPES = [
  { value: CostType.Charging, label: "Charging" },
  { value: CostType.Insurance, label: "Insurance" },
  { value: CostType.Maintenance, label: "Maintenance" },
  { value: CostType.Registration, label: "Registration" },
  { value: CostType.Cleaning, label: "Cleaning" },
  { value: CostType.Parking, label: "Parking" },
  { value: CostType.Toll, label: "Toll" },
  { value: CostType.Other, label: "Other" },
];

const CreateCostShareModal: React.FC<CreateCostShareModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [suggestions, setSuggestions] = useState<CostSharingSuggestion[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AICostSharingSuggestion | null>(null);
  const [formData, setFormData] = useState<CreateCostShareRequest>({
    groupId: "",
    vehicleId: "",
    costType: CostType.Other,
    title: "",
    description: "",
    totalAmount: 0,
    currency: "VND",
    dueDate: "",
    costShareDetails: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      groupId: "",
      vehicleId: "",
      costType: CostType.Other,
      title: "",
      description: "",
      totalAmount: 0,
      currency: "VND",
      dueDate: "",
      costShareDetails: [],
    });
    setSuggestions([]);
    setAiSuggestion(null);
    setError(null);
  };

  const loadGroups = async () => {
    try {
      const data = await ownershipService.getGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const handleGetSuggestions = async () => {
    if (!formData.groupId || !formData.totalAmount || formData.totalAmount <= 0) {
      setError("Please select a group and enter a valid total amount");
      return;
    }

    try {
      setLoadingSuggestions(true);
      setError(null);
      const request: GetCostSharingSuggestionRequest = {
        groupId: formData.groupId,
        totalCost: formData.totalAmount,
        costType: COST_TYPES.find((t) => t.value === formData.costType)?.label.toLowerCase() || "other",
      };
      const data = await paymentService.getCostSharingSuggestion(request);
      setSuggestions(data);

      // Auto-populate cost share details from suggestions
      if (data.length > 0) {
        const details = data.map((suggestion) => ({
          userId: suggestion.coOwnerId,
          ownershipPercentage: 0, // Will be calculated
          amount: suggestion.suggestedAmount,
          notes: suggestion.reason,
        }));
        setFormData((prev) => ({ ...prev, costShareDetails: details }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.groupId || !formData.vehicleId || !formData.title || formData.totalAmount <= 0) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.costShareDetails.length === 0) {
      setError("Please get suggestions or add cost share details");
      return;
    }

    try {
      setLoading(true);
      await paymentService.createCostShare(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cost share");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const selectedGroup = groups.find((g) => g.id === formData.groupId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Create Cost Share
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Create a new cost share for a vehicle group.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="custom-scrollbar max-h-[600px] overflow-y-auto px-2 pb-3">
            {error && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <Label>
                  Vehicle Group <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.groupId}
                  onChange={(value) => {
                    setFormData({ ...formData, groupId: value, vehicleId: "" });
                    setSuggestions([]);
                  }}
                  disabled={loading}
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.vehicleName}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedGroup && (
                <div>
                  <Label>
                    Vehicle <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={formData.vehicleId}
                    onChange={(value) =>
                      setFormData({ ...formData, vehicleId: value })
                    }
                    disabled={loading}
                    required
                  >
                    <option value="">Select a vehicle</option>
                    <option value={selectedGroup.id}>
                      {selectedGroup.vehicleName}
                    </option>
                  </Select>
                </div>
              )}

              <div>
                <Label>
                  Cost Type <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.costType.toString()}
                  onChange={(value) =>
                    setFormData({ ...formData, costType: parseInt(value) as CostType })
                  }
                  disabled={loading}
                  required
                >
                  {COST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>
                  Title <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={loading}
                  required
                  placeholder="Enter cost share title"
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={loading}
                  rows={3}
                  placeholder="Enter description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Total Amount <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={loading}
                    required
                    placeholder="0"
                    min="0"
                    step={0.01}
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={loading}
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>
                  Due Date <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleGetSuggestions}
                  disabled={loading || loadingSuggestions || !formData.groupId || formData.totalAmount <= 0}
                  variant="outline"
                  size="sm"
                >
                  {loadingSuggestions ? "Getting Suggestions..." : "Get Suggestions"}
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!formData.groupId || !formData.totalAmount || formData.totalAmount <= 0) {
                      setError("Please select a group and enter a valid total amount");
                      return;
                    }

                    try {
                      setLoadingSuggestions(true);
                      setError(null);
                      setAiSuggestion(null);

                      // Get co-owners for the group
                      const coOwners = await ownershipService.getCoOwners();
                      const groupCoOwners = coOwners.filter(() => {
                        // Filter by group membership (simplified - would need proper group membership check)
                        return true; // For now, use all co-owners
                      });

                      // Get ownerships for the group to get ownership percentages
                      const ownerships = await ownershipService.getOwnerships(formData.groupId);
                      
                      const aiRequest = {
                        vehicle_group_id: formData.groupId,
                        total_cost: formData.totalAmount,
                        cost_type: COST_TYPES.find((t) => t.value === formData.costType)?.label.toLowerCase() || "other",
                        co_owners: groupCoOwners.map((co) => {
                          const ownership = ownerships.find((o) => o.coOwnerId === co.id);
                          return {
                            id: co.id,
                            ownership_percentage: (ownership?.ownershipPercentage || 0) / 100,
                            usage_hours: 0, // Would need to fetch from usage history
                          };
                        }),
                      };

                      const aiData = await aiService.getCostSharingSuggestion(aiRequest);
                      if (aiData) {
                        setAiSuggestion(aiData);
                        // Auto-populate from AI suggestions
                        const details = aiData.suggestions.map((suggestion) => ({
                          userId: suggestion.co_owner_id,
                          ownershipPercentage: 0,
                          amount: suggestion.suggested_amount,
                          notes: suggestion.reason,
                        }));
                        setFormData((prev) => ({ ...prev, costShareDetails: details }));
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to get AI suggestions");
                    } finally {
                      setLoadingSuggestions(false);
                    }
                  }}
                  disabled={loading || loadingSuggestions || !formData.groupId || formData.totalAmount <= 0}
                  variant="outline"
                  size="sm"
                >
                  {loadingSuggestions ? "Getting AI..." : "Get AI Suggestions"}
                </Button>
              </div>

              {suggestions.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <h5 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cost Share Suggestions (Payment Service)
                  </h5>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                            Co-owner: {suggestion.coOwnerId.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.reason} ({suggestion.method})
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                          ₫{suggestion.suggestedAmount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiSuggestion && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
                  <h5 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-200">
                    AI Cost Sharing Suggestions ({aiSuggestion.method})
                  </h5>
                  <div className="space-y-2">
                    {aiSuggestion.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded border border-blue-200 bg-white p-2 dark:border-blue-700 dark:bg-gray-900"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                            Co-owner: {suggestion.co_owner_id.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {suggestion.reason}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                          ₫{suggestion.suggested_amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-2 dark:border-blue-700">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Total Suggested
                      </p>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        ₫{aiSuggestion.total_suggested.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Cost Share"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateCostShareModal;

