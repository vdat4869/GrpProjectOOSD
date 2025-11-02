using FluentValidation;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Validators;

public class CreateCoOwnerDtoValidator : AbstractValidator<CreateCoOwnerDto>
{
    public CreateCoOwnerDtoValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("UserId is required")
            .MaximumLength(100).WithMessage("UserId must not exceed 100 characters");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required")
            .MaximumLength(200).WithMessage("Full name must not exceed 200 characters");

        RuleFor(x => x.IdentityCardNumber)
            .NotEmpty().WithMessage("Identity card number is required")
            .MaximumLength(20).WithMessage("Identity card number must not exceed 20 characters")
            .Matches(@"^\d+$").WithMessage("Identity card number must contain only digits");

        RuleFor(x => x.DrivingLicenseNumber)
            .MaximumLength(20).WithMessage("Driving license number must not exceed 20 characters")
            .Matches(@"^\d+$").When(x => !string.IsNullOrEmpty(x.DrivingLicenseNumber))
            .WithMessage("Driving license number must contain only digits");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(100).WithMessage("Email must not exceed 100 characters");

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(15).WithMessage("Phone number must not exceed 15 characters")
            .Matches(@"^[\d\-\+\(\)]+$").When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage("Invalid phone number format");

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Address must not exceed 500 characters");
    }
}

