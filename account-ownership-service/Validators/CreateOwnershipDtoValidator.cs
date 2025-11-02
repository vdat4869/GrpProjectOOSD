using FluentValidation;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Validators;

public class CreateOwnershipDtoValidator : AbstractValidator<CreateOwnershipDto>
{
    public CreateOwnershipDtoValidator()
    {
        RuleFor(x => x.CoOwnerId)
            .NotEmpty().WithMessage("Co-owner ID is required");

        RuleFor(x => x.VehicleGroupId)
            .NotEmpty().WithMessage("Vehicle group ID is required");

        RuleFor(x => x.OwnershipPercentage)
            .NotEmpty().WithMessage("Ownership percentage is required")
            .InclusiveBetween(0.01m, 100.00m)
            .WithMessage("Ownership percentage must be between 0.01% and 100.00%");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required")
            .LessThanOrEqualTo(DateTime.UtcNow.AddDays(365))
            .WithMessage("Start date cannot be more than 1 year in the future");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes must not exceed 1000 characters");
    }
}

