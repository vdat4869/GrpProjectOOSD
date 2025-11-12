using FluentValidation;
using OwnershipService.DTOs;

namespace OwnershipService.Validators;

public class CreateEContractDtoValidator : AbstractValidator<CreateEContractDto>
{
    public CreateEContractDtoValidator()
    {
        RuleFor(x => x.CoOwnerId)
            .NotEmpty().WithMessage("Co-owner ID is required");

        RuleFor(x => x.VehicleGroupId)
            .NotEmpty().WithMessage("Vehicle group ID is required");

        RuleFor(x => x.ContractTitle)
            .NotEmpty().WithMessage("Contract title is required")
            .MaximumLength(200).WithMessage("Contract title must not exceed 200 characters");

        RuleFor(x => x.ContractContent)
            .NotEmpty().WithMessage("Contract content is required")
            .MaximumLength(5000).WithMessage("Contract content must not exceed 5000 characters");

        RuleFor(x => x.OwnershipPercentage)
            .NotEmpty().WithMessage("Ownership percentage is required")
            .InclusiveBetween(0.01m, 100.00m)
            .WithMessage("Ownership percentage must be between 0.01% and 100.00%");

        RuleFor(x => x.ExpiresAt)
            .GreaterThan(DateTime.UtcNow)
            .When(x => x.ExpiresAt.HasValue)
            .WithMessage("Expiration date must be in the future");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes must not exceed 1000 characters");
    }
}

